import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { QueryType } from '../query/query-classification.service';
import { McpToolsService } from '../mcp/mcp-tools.service';

/**
 * Enhanced LLM Service with MCP Tool Support
 * 
 * This service supports function calling where the LLM can decide
 * which tools to call based on the user query.
 */
@Injectable()
export class LlmWithToolsService {
  private ollama: Ollama;
  private llmModel: string;

  constructor(
    private mcpToolsService: McpToolsService,
    private configService: ConfigService,
  ) {
    this.ollama = new Ollama({
      host: this.configService.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434',
    });
    this.llmModel = this.configService.get<string>('OLLAMA_LLM_MODEL') || 'deepseekv3.2-cloud';
  }

  /**
   * Generate response with tool calling support
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
      const toolSelectionPrompt = this.buildToolSelectionPrompt(query, tools, queryType);

      const toolSelectionResponse = await this.ollama.chat({
        model: this.llmModel,
        messages: [
          ...(conversationHistory || []).map(m => ({ role: m.role as 'user' | 'system' | 'assistant', content: m.content })),
          { role: 'user', content: toolSelectionPrompt }
        ],
        stream: false,
      });

      // Step 2: Parse LLM's tool selection
      const toolCalls = this.parseToolCalls(
        toolSelectionResponse.message.content,
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

          toolResults.push({
            tool: toolCall.name,
            rawData: result,
          });
        } catch (error: any) {
          toolResults.push({
            tool: toolCall.name,
            error: error.message,
          });
        }
      }

      // If no tools were called or needed, just answer normally (or return tool selection response?)
      // But the prompt was specific about tool selection. 
      // If toolResults is empty, maybe the LLM didn't find any tools useful or just answered.
      if (toolResults.length === 0) {
        // If no tools used, we might want to return the original response if it wasn't JSON?
        // But our prompt forced JSON.
        if (!toolCalls.length) {
          // Maybe fallback to standard generation?
          return "I couldn't identify the right tools to answer your question. I'm just a text assistant.";
        }
      }

      // Step 4: Format raw data into well-structured response
      const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);

      const finalResponse = await this.ollama.chat({
        model: this.llmModel,
        messages: [
          ...(conversationHistory || []).map(m => ({ role: m.role as 'user' | 'system' | 'assistant', content: m.content })),
          { role: 'user', content: finalPrompt }
        ],
        stream: false,
      });

      return finalResponse.message.content;

    } catch (error: any) {
      console.error('LLM with tools error:', error);
      return await this.fallbackToolExecution(query, studentId, queryType);
    }
  }

  /**
   * Generate streaming response with tool calling support
   */
  async *generateStreamingResponseWithTools(
    query: string,
    studentId: string,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const tools = this.mcpToolsService.getAvailableTools();

      // Step 1: Tool Selection (Non-streaming)
      const toolSelectionPrompt = this.buildToolSelectionPrompt(query, tools, queryType);

      const toolSelectionResponse = await this.ollama.chat({
        model: this.llmModel,
        messages: [
          ...(conversationHistory || []).map(m => ({ role: m.role as 'user' | 'system' | 'assistant', content: m.content })),
          { role: 'user', content: toolSelectionPrompt }
        ],
        stream: false,
      });

      const toolCalls = this.parseToolCalls(
        toolSelectionResponse.message.content,
        tools,
      );

      // Step 2: Execute tools
      const toolResults: any[] = [];
      for (const toolCall of toolCalls) {
        try {
          const result = await this.mcpToolsService.executeTool(
            toolCall.name,
            toolCall.parameters,
            studentId,
          );
          toolResults.push({ tool: toolCall.name, rawData: result });
        } catch (error: any) {
          toolResults.push({ tool: toolCall.name, error: error.message });
        }
      }

      // Step 3: Stream Final Response
      const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);

      const streamResponse = await this.ollama.chat({
        model: this.llmModel,
        messages: [
          ...(conversationHistory || []).map(m => ({ role: m.role as 'user' | 'system' | 'assistant', content: m.content })),
          { role: 'user', content: finalPrompt }
        ],
        stream: true,
      });

      for await (const chunk of streamResponse) {
        yield chunk.message.content;
      }

    } catch (error: any) {
      console.error('LLM with tools streaming error:', error);
      // Fallback
      for await (const chunk of this.fallbackToolExecutionStream(query, studentId, queryType)) {
        yield chunk;
      }
    }
  }

  // ... (Keep existing private helper methods: suggestToolsFromQuery, buildToolSelectionPrompt, parseToolCalls, buildFinalResponsePrompt, formatFallbackResponse)
  // I will include them in the file content to ensure it is complete.

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
Respond with JSON only, no additional text.`;
  }

  private parseToolCalls(llmResponse: string, availableTools: any[]): any[] {
    try {
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
    return this.suggestToolsFromQuery(llmResponse, availableTools);
  }

  private buildFinalResponsePrompt(
    query: string,
    toolResults: any[],
    queryType: QueryType,
  ): string {
    const rawDataArray = toolResults
      .map((tr) => (tr.error ? null : tr.rawData))
      .filter(Boolean);

    const rawDataJson = JSON.stringify(rawDataArray.length === 1 ? rawDataArray[0] : rawDataArray, null, 2);

    return `The user asked: "${query}"

Here is the JSON data from the database:
${rawDataJson}

Make it well-structured and easy to read.`;
  }

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
        toolResults.push({ tool: toolCall.name, rawData: result });
      } catch (error: any) {
        toolResults.push({ tool: toolCall.name, error: error.message });
      }
    }

    const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);

    try {
      const response = await this.ollama.chat({
        model: this.llmModel,
        messages: [{ role: 'user', content: finalPrompt }],
      });
      return response.message.content;
    } catch (error) {
      console.error('Fallback formatting failed:', error);
      return this.formatFallbackResponse(toolResults);
    }
  }

  private async* fallbackToolExecutionStream(
    query: string,
    studentId: string,
    queryType: QueryType,
  ): AsyncGenerator<string, void, unknown> {
    const tools = this.mcpToolsService.getAvailableTools();
    const suggestedTools = this.suggestToolsFromQuery(query, tools);

    if (suggestedTools.length === 0) {
      yield 'I apologize, but I couldn\'t process your query.';
      return;
    }

    const toolResults: any[] = [];
    for (const toolCall of suggestedTools) {
      try {
        const result = await this.mcpToolsService.executeTool(
          toolCall.name,
          toolCall.parameters,
          studentId,
        );
        toolResults.push({ tool: toolCall.name, rawData: result });
      } catch (error: any) {
        toolResults.push({ tool: toolCall.name, error: error.message });
      }
    }

    const finalPrompt = this.buildFinalResponsePrompt(query, toolResults, queryType);

    try {
      const stream = await this.ollama.chat({
        model: this.llmModel,
        messages: [{ role: 'user', content: finalPrompt }],
        stream: true,
      });
      for await (const chunk of stream) {
        yield chunk.message.content;
      }
    } catch (error) {
      const formatted = this.formatFallbackResponse(toolResults);
      for (const char of formatted) {
        yield char;
      }
    }
  }

  private formatFallbackResponse(toolResults: any[]): string {
    const formatted = toolResults
      .map((tr) => {
        if (tr.error) return `Error: ${tr.error}`;
        if (tr.rawData) return this.mcpToolsService.formatToolResponse(tr.tool, tr.rawData);
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    return formatted || 'Unable to retrieve data';
  }
}
