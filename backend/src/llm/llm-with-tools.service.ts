import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { QueryType } from '../query/query-classification.service';
import { McpToolsService } from '../mcp/mcp-tools.service';

/**
 * Enhanced LLM Service with MCP Tool Support
 * 
 * This service supports function calling where the LLM can decide
 * which tools to call based on the user query, making it more flexible
 * and scalable than keyword matching.
 */
@Injectable()
export class LlmWithToolsService {
  private lightragUrl: string;

  constructor(
    private mcpToolsService: McpToolsService,
  ) {
    this.lightragUrl = process.env.LIGHTRAG_API_URL || 'http://localhost:9621';
  }

  /**
   * Generate response with tool calling support
   * 
   * Flow:
   * 1. Send query + tool definitions to LLM
   * 2. LLM decides which tools to call
   * 3. Execute tools and get data
   * 4. Send data back to LLM for final response
   */
  async generateResponseWithTools(
    query: string,
    studentId: string,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<string> {
    try {
      // Get available tools
      const tools = this.mcpToolsService.getAvailableTools();

      // Step 1: Send query with tool definitions to LLM
      // Ask LLM which tools it wants to call
      const toolSelectionPrompt = this.buildToolSelectionPrompt(query, tools, queryType);
      
      const toolSelectionResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: toolSelectionPrompt,
          mode: 'bypass', // Use bypass mode for tool selection (no RAG needed)
          top_k: 0,
          include_references: false,
          conversation_history: conversationHistory,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
          },
        },
      );

      // Step 2: Parse LLM's tool selection
      const toolCalls = this.parseToolCalls(
        toolSelectionResponse.data.response || toolSelectionResponse.data.message,
        tools,
      );

      // Step 3: Execute tools and collect data
      const toolResults: any[] = [];
      for (const toolCall of toolCalls) {
        try {
          const result = await this.mcpToolsService.executeTool(
            toolCall.name,
            toolCall.parameters,
            studentId,
          );
          
          // Don't format here - we'll let LLM format it properly
          // const formattedResult = this.mcpToolsService.formatToolResponse(
          //   toolCall.name,
          //   result,
          // );
          
          toolResults.push({
            tool: toolCall.name,
            result: '', // Empty - we'll use rawData for formatting
            rawData: result, // Keep raw data for LLM to format
          });
        } catch (error: any) {
          toolResults.push({
            tool: toolCall.name,
            error: error.message,
          });
        }
      }

      // Step 4: Generate final response with tool results using bypass mode for well-structured output
      const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);
      
      const finalResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: finalPrompt,
          mode: 'bypass', // Use bypass mode for well-structured, formatted output
          top_k: 0, // No retrieval in bypass mode
          include_references: false,
          conversation_history: conversationHistory,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
          },
        },
      );

      return finalResponse.data.response || finalResponse.data.message || 'No response generated';
    } catch (error: any) {
      console.error('LLM with tools error:', error.response?.data || error.message);
      // Fallback: try to use tools directly based on query analysis
      return await this.fallbackToolExecution(query, studentId, queryType);
    }
  }

  /**
   * Build prompt for tool selection
   */
  private buildToolSelectionPrompt(
    query: string,
    tools: any[],
    queryType: QueryType,
  ): string {
    const toolsDescription = tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.parameters)}`,
      )
      .join('\n\n');

    return `You are an AI assistant helping a student with their academic queries.

The user asked: "${query}"

Available tools you can use to fetch private student data:
${toolsDescription}

Based on the user's query, determine which tool(s) you need to call. Respond ONLY with a JSON array of tool calls in this exact format:
[
  {
    "name": "tool_name",
    "parameters": {
      "param1": "value1"
    }
  }
]

If no tools are needed, respond with an empty array: [].

Query type: ${queryType}
Respond with JSON only, no additional text.`;
  }

  /**
   * Parse tool calls from LLM response
   */
  private parseToolCalls(llmResponse: string, availableTools: any[]): any[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((call) => {
            const tool = availableTools.find((t) => t.name === call.name);
            return tool !== undefined;
          });
        }
      }
    } catch (error) {
      console.error('Error parsing tool calls:', error);
    }

    // Fallback: analyze query and suggest tools
    return this.suggestToolsFromQuery(llmResponse, availableTools);
  }

  /**
   * Fallback: suggest tools based on query keywords
   */
  private suggestToolsFromQuery(query: string, availableTools: any[]): any[] {
    const lowerQuery = query.toLowerCase();
    const suggested: any[] = [];

    if (lowerQuery.includes('grade') || lowerQuery.includes('gpa') || lowerQuery.includes('mark')) {
      suggested.push({ name: 'get_student_grades', parameters: {} });
    }
    if (lowerQuery.includes('payment') || lowerQuery.includes('fee') || lowerQuery.includes('due')) {
      suggested.push({ name: 'get_student_payments', parameters: {} });
    }
    if (lowerQuery.includes('course') && (lowerQuery.includes('enroll') || lowerQuery.includes('current'))) {
      suggested.push({ name: 'get_enrolled_courses', parameters: {} });
    }
    if (lowerQuery.includes('attendance') || lowerQuery.includes('present')) {
      suggested.push({ name: 'get_attendance', parameters: {} });
    }
    if (lowerQuery.includes('summary') || lowerQuery.includes('overall') || lowerQuery.includes('dashboard')) {
      suggested.push({ name: 'get_academic_summary', parameters: {} });
    }
    if (lowerQuery.includes('profile') || lowerQuery.includes('info') || lowerQuery.includes('standing')) {
      suggested.push({ name: 'get_student_profile', parameters: {} });
    }

    return suggested;
  }

  /**
   * Build final prompt with tool results for well-structured output
   */
  private buildFinalResponsePrompt(
    query: string,
    toolResults: any[],
    queryType: QueryType,
  ): string {
    // Check if user wants tabular format
    const wantsTable = query.toLowerCase().includes('table') || 
                       query.toLowerCase().includes('tabular') ||
                       query.toLowerCase().includes('in a table');

    // Get raw data without the formatted tool response
    const rawDataArray = toolResults
      .map((tr) => {
        if (tr.error) {
          return null;
        }
        return tr.rawData; // Use raw data instead of formatted result
      })
      .filter(Boolean);

    // If single tool result, use it directly; otherwise combine
    const toolData = rawDataArray.length === 1 
      ? JSON.stringify(rawDataArray[0], null, 2)
      : JSON.stringify({ tools: rawDataArray }, null, 2);

    let formatInstructions = '';
    if (wantsTable) {
      formatInstructions = `FORMAT AS TABLE:
- Create a markdown table with appropriate columns
- Use | for table structure
- Include headers for all relevant fields
- Make it easy to scan and compare data`;
    } else {
      formatInstructions = `FORMATTING REQUIREMENTS:
- Use clear markdown headings (##, ###) to organize sections
- Format lists using proper markdown list syntax with proper line breaks
- Use bold text (**text**) for important information like course codes, grades, and statuses
- Group related information together (e.g., current semester vs previous semester)
- Add proper spacing and line breaks for readability (use double newlines between sections)
- Be conversational and helpful, not just a data dump
- Highlight key information (GPA, status, important dates)
- Use structured lists where appropriate
- DO NOT output raw data in a single line - break it into readable sections`;
    }

    return `You are an AI assistant helping a student with their academic queries at BITS Dubai.

The user asked: "${query}"

Here is the raw JSON data retrieved from the student's records:
${toolData}

CRITICAL INSTRUCTIONS:
1. DO NOT output the raw data as-is
2. Transform this JSON data into a well-structured, professional, and easy-to-read response
3. Parse the JSON structure and format it properly
4. ${formatInstructions}

EXAMPLE OF GOOD FORMATTING:
## Your Academic Grades

Here are your grades organized by semester:

### Current Semester (2025-2026)

**CS F301: Principles of Programming Languages**
- Status: In Progress
- Grades: Not yet available

**CS F342: Computer Architecture**
- Status: In Progress
- Grades: Not yet available

### Previous Semester (2024-2025)

**CS F213: Object Oriented Programming**
- Mid-Semester: 75 (Grade: C)
- Final: 78 (Grade: C)
- Total: 76.5
- GPA: 6.0
- Status: Completed

**CS F214: Logic in Computer Science**
- Mid-Semester: 85 (Grade: B)
- Final: 88 (Grade: B)
- Total: 86.5
- GPA: 8.0
- Status: Completed

Now format the provided data in a similar well-structured way. Use proper markdown formatting with headings, lists, and spacing.`;
  }

  /**
   * Fallback: execute tools directly based on query analysis
   */
  private async fallbackToolExecution(
    query: string,
    studentId: string,
    queryType: QueryType,
  ): Promise<string> {
    const tools = this.mcpToolsService.getAvailableTools();
    const suggestedTools = this.suggestToolsFromQuery(query, tools);

    if (suggestedTools.length === 0) {
      return 'I apologize, but I couldn\'t process your query. Please try rephrasing your question.';
    }

    const toolResults: any[] = [];
    for (const toolCall of suggestedTools) {
      try {
        const result = await this.mcpToolsService.executeTool(
          toolCall.name,
          toolCall.parameters,
          studentId,
        );
        // Don't format - let LLM format it
        toolResults.push({
          tool: toolCall.name,
          result: '', // Empty - we'll use rawData for formatting
          rawData: result, // Keep raw data for LLM to format
        });
      } catch (error: any) {
        console.error(`Tool ${toolCall.name} error:`, error);
        toolResults.push({
          tool: toolCall.name,
          error: error.message,
        });
      }
    }

    // Use bypass mode to format the response nicely
    const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);
    try {
      const finalApiResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: finalPrompt,
          mode: 'bypass', // Use bypass mode for well-structured output
          top_k: 0,
          include_references: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
          },
        },
      );
      return finalApiResponse.data.response || finalApiResponse.data.message || toolResults.map((tr) => tr.result).join('\n\n');
    } catch (error) {
      // Ultimate fallback - return raw formatted data
      return toolResults.map((tr) => tr.result).join('\n\n');
    }
  }
}

