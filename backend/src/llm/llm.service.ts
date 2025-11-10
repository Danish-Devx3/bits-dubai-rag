import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { QueryType } from '../query/query-classification.service';

@Injectable()
export class LlmService {
  private lightragUrl: string;

  constructor() {
    this.lightragUrl = process.env.LIGHTRAG_API_URL || 'http://localhost:9621';
  }

  async generateResponse(
    query: string,
    contextData: any,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
    useBypassMode: boolean = false,
  ): Promise<string> {
    try {
      // Build enhanced query with context
      const enhancedQuery = this.buildEnhancedQuery(query, contextData, queryType);

      // Use bypass mode if no context available - this allows LLM to answer from its knowledge
      const mode = useBypassMode ? 'bypass' : 'mix';

      // Call LightRAG API
      const response = await axios.post(
        `${this.lightragUrl}/query`,
        {
          query: enhancedQuery,
          mode: mode,
          // Don't set top_k for bypass mode (API requires >= 1), use 10 for other modes
          ...(useBypassMode ? {} : { top_k: 10 }),
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

      let responseText = response.data.response || response.data.message || 'No response generated';
      
      // If using bypass mode and no context, add helpful message
      if (useBypassMode) {
        responseText = `I couldn't find specific information about "${query}" in the available documents. However, based on general knowledge:\n\n${responseText}\n\n**Note:** For accurate and up-to-date information, please try asking about specific topics like:\n- Academic calendar and exam dates\n- Course catalog and open electives\n- GPA calculation rules\n- Credit system information\n- Your personal academic records (if logged in)`;
      }

      return responseText;
    } catch (error: any) {
      console.error('LightRAG API error:', error.response?.data || error.message);
      // Fallback response
      return this.generateFallbackResponse(query, contextData, queryType, useBypassMode);
    }
  }

  private buildEnhancedQuery(
    query: string,
    contextData: any,
    queryType: QueryType,
  ): string {
    let enhancedQuery = query;

    // Add context hints for better RAG retrieval
    if (queryType === QueryType.PRIVATE || queryType === QueryType.MIXED) {
      if (contextData.grades && contextData.grades.length > 0) {
        enhancedQuery += ` [Student Academic Records Available]`;
      }
      if (contextData.payments && contextData.payments.length > 0) {
        enhancedQuery += ` [Payment Information Available]`;
      }
    }

    if (queryType === QueryType.PUBLIC || queryType === QueryType.MIXED) {
      if (contextData.openElectives && contextData.openElectives.length > 0) {
        enhancedQuery += ` [Course Catalog Available]`;
      }
      if (contextData.midsemDates && contextData.midsemDates.length > 0) {
        enhancedQuery += ` [Academic Calendar Available]`;
      }
    }

    return enhancedQuery;
  }

  private generateFallbackResponse(
    query: string,
    contextData: any,
    queryType: QueryType,
    useBypassMode: boolean = false,
  ): string {
    // Simple fallback when LightRAG is not available
    if (contextData.grades && contextData.grades.length > 0) {
      return `Your grades for the requested semester:\n${contextData.grades
        .map(
          (g: any) =>
            `- ${g.course?.courseCode || 'N/A'}: ${g.finalGrade || g.midSemGrade || 'In Progress'}`,
        )
        .join('\n')}`;
    }

    if (contextData.openElectives && contextData.openElectives.length > 0) {
      return `Open electives available:\n${contextData.openElectives
        .map((c: any) => `- ${c.courseCode}: ${c.courseName} (${c.credits} credits)`)
        .join('\n')}`;
    }

    if (contextData.midsemDates && contextData.midsemDates.length > 0) {
      const dates = contextData.midsemDates[0];
      return `Mid-semester examinations are scheduled from ${dates.startDate} to ${dates.endDate}.`;
    }

    if (useBypassMode) {
      return `I couldn't find specific information about "${query}" in the available documents. The information you're looking for may not be available in the current knowledge base.\n\nPlease try asking about:\n- Academic calendar and important dates\n- Course information and electives\n- Academic policies and rules\n- Your personal academic records (if logged in)`;
    }

    return 'I apologize, but I couldn\'t find the specific information you\'re looking for. Please try rephrasing your question or ask about topics like academic calendar, courses, or your academic records.';
  }

  async *generateStreamingResponse(
    query: string,
    contextData: any,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const enhancedQuery = this.buildEnhancedQuery(query, contextData, queryType);

      const response = await axios.post(
        `${this.lightragUrl}/query/stream`,
        {
          query: enhancedQuery,
          mode: 'mix',
          stream: true,
          conversation_history: conversationHistory,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LIGHTRAG_TOKEN || ''}`,
          },
          responseType: 'stream',
        },
      );

      // Stream the response
      for await (const chunk of this.streamResponse(response.data)) {
        yield chunk;
      }
    } catch (error: any) {
      console.error('LightRAG streaming error:', error);
      const fallback = this.generateFallbackResponse(query, contextData, queryType);
      for (const char of fallback) {
        yield char;
      }
    }
  }

  private async* streamResponse(stream: any): AsyncGenerator<string, void, unknown> {
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

        try {
          const dataStr = trimmedLine.slice(6);
          if (dataStr === '[DONE]' || dataStr === 'null') {
            return;
          }
          const parsed = JSON.parse(dataStr);
          if (parsed.content) {
            yield parsed.content;
          } else if (parsed.response) {
            yield parsed.response;
          }
          if (parsed.done === true) {
            return;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}
