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
          // Don't set top_k for bypass mode - API requires >= 1 or omit it
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
          // Don't set top_k for bypass mode - API requires >= 1 or omit it
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

    // Let LLM understand the format from user's query - no need to detect explicitly
    return `The user asked: "${query}"

Here is the JSON data from the database:
${rawDataJson}

Make it well-structured and easy to read.`;
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
      // Try bypass mode first
      // Note: Don't set top_k to 0 - API requires >= 1, or omit it for bypass mode
      const finalApiResponse = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: finalPrompt,
          mode: 'bypass',
          // Don't set top_k for bypass mode - let API use default
          include_references: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
          },
          timeout: 30000, // 30 second timeout
        },
      );
      
      const response = finalApiResponse.data.response || finalApiResponse.data.message;
      if (response && response.trim()) {
        return response;
      }
      
      // If response is empty, fall back to manual formatting
      return this.formatFallbackResponse(toolResults);
    } catch (error: any) {
      console.error('Bypass mode formatting failed:', error.response?.data || error.message);
      
      // If 422 error, try with simpler prompt or use fallback
      if (error.response?.status === 422) {
        console.log('422 error - trying with simplified prompt');
        try {
          // Try with a simpler, shorter prompt
          const simplePrompt = this.buildSimplePrompt(query, toolResults);
          const simpleResponse = await axios.post(
            `${this.lightragUrl}/query`,
            {
              query: simplePrompt,
              mode: 'bypass',
              // Don't set top_k for bypass mode
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
              },
            },
          );
          return simpleResponse.data.response || simpleResponse.data.message || this.formatFallbackResponse(toolResults);
        } catch (simpleError) {
          console.error('Simple prompt also failed:', simpleError);
          return this.formatFallbackResponse(toolResults);
        }
      }
      
      // Ultimate fallback - format manually
      return this.formatFallbackResponse(toolResults);
    }
  }

  /**
   * Build simpler prompt for 422 error cases
   */
  private buildSimplePrompt(query: string, toolResults: any[]): string {
    const rawDataArray = toolResults
      .map((tr) => tr.rawData)
      .filter(Boolean);
    
    const rawDataJson = rawDataArray.length === 1 
      ? JSON.stringify(rawDataArray[0], null, 2)
      : JSON.stringify(rawDataArray, null, 2);
    
    // Let LLM understand format from query - no explicit detection needed
    return `User asked: "${query}"

Format this JSON data according to the user's request:
${rawDataJson}

Use appropriate markdown formatting based on what the user wants.`;
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

