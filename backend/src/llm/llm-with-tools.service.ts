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
          
          // Store raw data - we'll format it with bypass mode later
          toolResults.push({
            tool: toolCall.name,
            rawData: result, // Keep raw data for LLM to format
          });
        } catch (error: any) {
          toolResults.push({
            tool: toolCall.name,
            error: error.message,
          });
        }
      }

      // Step 4: Use bypass mode to format raw data into well-structured response
      const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);
      
      const finalResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: finalPrompt,
          mode: 'bypass', // Always use bypass mode for final formatted output
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
   * Build final prompt with raw data for bypass mode formatting
   */
  private buildFinalResponsePrompt(
    query: string,
    toolResults: any[],
    queryType: QueryType,
  ): string {
    // Extract raw data from tool results
    const rawDataArray = toolResults
      .map((tr) => {
        if (tr.error) {
          return null;
        }
        return tr.rawData;
      })
      .filter(Boolean);

    // Format raw data as JSON for LLM to parse
    const rawDataJson = rawDataArray.length === 1 
      ? JSON.stringify(rawDataArray[0], null, 2)
      : JSON.stringify(rawDataArray, null, 2);

    return `You are an AI assistant helping a student with their academic queries at BITS Dubai.

The user asked: "${query}"

Here is the raw JSON data retrieved from the student's records:
${rawDataJson}

IMPORTANT INSTRUCTIONS:
1. Parse the JSON data structure carefully
2. Transform this raw data into a well-structured, professional response
3. Format the response based on how the user asked (they may want table, list, summary, etc.)
4. Use proper markdown formatting (headings, lists, bold text, spacing)
5. Be conversational and helpful
6. Organize information logically (group by semester, course, etc.)
7. Make it easy to read and scan

FORMATTING GUIDELINES:
- Use markdown headings (##, ###) for sections
- Use lists with proper spacing
- Use bold (**text**) for important info (course codes, grades, statuses)
- Add proper line breaks between sections
- Group related information together
- If user asked for table format, create a markdown table
- If user asked for summary, provide a concise overview
- Adapt to the user's query style and intent

Now format the provided JSON data into a well-structured response that answers the user's query clearly and professionally.`;
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
        // Store raw data - format with bypass mode later
        toolResults.push({
          tool: toolCall.name,
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

    // Use bypass mode to format raw data into well-structured response
    const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);
    try {
      const finalApiResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: finalPrompt,
          mode: 'bypass', // Always use bypass mode for final formatted output
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
      return finalApiResponse.data.response || finalApiResponse.data.message || 'Unable to format response';
    } catch (error) {
      console.error('Bypass mode formatting failed:', error);
      // Ultimate fallback - format manually
      return this.formatFallbackResponse(toolResults);
    }
  }

  /**
   * Fallback formatter if bypass mode fails
   */
  private formatFallbackResponse(toolResults: any[]): string {
    const formatted = toolResults
      .map((tr) => {
        if (tr.error) {
          return `Error: ${tr.error}`;
        }
        if (tr.rawData) {
          return this.mcpToolsService.formatToolResponse(tr.tool, tr.rawData);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    return formatted || 'Unable to retrieve data';
  }
}

