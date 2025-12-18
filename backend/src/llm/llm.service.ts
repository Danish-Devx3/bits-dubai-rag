import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { QdrantService } from '../qdrant/qdrant.service';
import { QueryType } from '../query/query-classification.service';

@Injectable()
export class LlmService {
  private ollamaEmbedding: Ollama;  // For embeddings (local)
  private ollamaLlm: Ollama;        // For LLM chat (can be cloud)
  private embeddingModel: string;
  private llmModel: string;

  constructor(
    private configService: ConfigService,
    private qdrantService: QdrantService,
  ) {
    // Embedding client - uses local Ollama by default
    const embeddingUrl = this.configService.get<string>('OLLAMA_BASE_URL')
      || 'http://ollama:11434';

    // LLM client - can use cloud API
    // LLM client - can use cloud API
    const llmUrl = this.configService.get<string>('OLLAMA_BASE_CLOUD_URL')
      || "https://ollama.com";
    const apiKey = this.configService.get<string>('OLLAMA_API_KEY');

    const headers = apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined;

    this.ollamaEmbedding = new Ollama({ host: embeddingUrl }); // Local embeddings don't need the key
    this.ollamaLlm = new Ollama({ host: llmUrl, headers });

    // Self-healing for Windows localhost issues
    if (llmUrl.includes('localhost')) {
      const testConnection = async () => {
        try {
          await this.ollamaLlm.list();
          console.log(`✅ Ollama connected at ${llmUrl}`);
        } catch (e) {
          const fallback = llmUrl.replace('localhost', '127.0.0.1');
          console.warn(`⚠️ LLM connection to ${llmUrl} failed. Switching to internal fallback: ${fallback}`);
          this.ollamaLlm = new Ollama({ host: fallback, headers });
          this.ollamaEmbedding = new Ollama({ host: embeddingUrl.replace('localhost', '127.0.0.1') });
        }
      };
      testConnection();
    }

    this.embeddingModel = this.configService.get<string>('OLLAMA_EMBEDDING_MODEL') || 'bge-m3';
    this.llmModel = this.configService.get<string>('OLLAMA_LLM_MODEL') || 'deepseek-r1';

    console.log(`[LLM Service] Embedding URL: ${embeddingUrl}, Model: ${this.embeddingModel}`);
    console.log(`[LLM Service] LLM URL: ${llmUrl}, Model: ${this.llmModel}`);
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await this.ollamaEmbedding.embeddings({
      model: this.embeddingModel,
      prompt: text,
    });
    return response.embedding;
  }


  async generateResponse(
    query: string,
    contextData: any,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
    useBypassMode: boolean = false,
  ): Promise<string> {
    try {
      // 1. Get Embedding
      const embeddingResponse = await this.ollamaEmbedding.embeddings({
        model: this.embeddingModel,
        prompt: query,
      });

      // 2. Search Vector DB (unless strictly bypass, but usually we want knowledge base anyway)
      // If useBypassMode is true, it means we didn't find *structured* data, but we might still find vector data.
      let unstructuredContext = '';
      try {
        const searchResults = await this.qdrantService.search(embeddingResponse.embedding);
        unstructuredContext = searchResults
          .map((res: any) => res.payload?.content)
          .filter(Boolean)
          .join('\n\n');
      } catch (err) {
        console.error('Vector search failed:', err);
      }

      // 3. Construct System Prompt
      const contextString = this.formatContext(contextData);

      const systemMessage = `You are BITS Dubai GPT, an intelligent assistant for BITS Pilani Dubai Campus students.
      
      Instructions:
      - Answer the user's question based ONLY on the provided context.
      - If the answer is not in the context, say you don't know, or provide general advice if safely possible.
      - Be helpful, concise, and professional.
      
      ${unstructuredContext ? `### Knowledge Base Context:\n${unstructuredContext}\n` : ''}
      
      ${contextString ? `### Student/Structured Data:\n${contextString}\n` : ''}
      `;

      const messages = [
        { role: 'system', content: systemMessage },
        ...(conversationHistory || []).map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant', // Type assertion
          content: msg.content
        })),
        { role: 'user', content: query }
      ];

      // 4. Generate
      const response = await this.ollamaLlm.chat({
        model: this.llmModel,
        messages: messages,
      });

      return response.message.content;

    } catch (error: any) {
      if (error.status_code === 503) {
        console.error('❌ Ollama Service Unavailable (503). This usually means the model is too large, still loading, or the proxy failed.');
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
        console.error('❌ Connection failed. Ensure Ollama/Qdrant are running and check if localhost vs 127.0.0.1 is an issue.');
      }
      console.error('LLM Generation Error:', error);
      return this.generateFallbackResponse(query, contextData);
    }
  }

  async *generateStreamingResponse(
    query: string,
    contextData: any,
    queryType: QueryType,
    conversationHistory?: Array<{ role: string; content: string }>,
    useBypassMode: boolean = false,
  ): AsyncGenerator<string, void, unknown> {
    try {
      // 1. Get Embedding
      const embeddingResponse = await this.ollamaEmbedding.embeddings({
        model: this.embeddingModel,
        prompt: query,
      });

      // 2. Search Vector DB
      let unstructuredContext = '';
      try {
        const searchResults = await this.qdrantService.search(embeddingResponse.embedding);
        unstructuredContext = searchResults
          .map((res: any) => res.payload?.content)
          .filter(Boolean)
          .join('\n\n');
      } catch (err) {
        console.error('Vector search failed during stream:', err);
      }

      // 3. Construct Prompt
      const contextString = this.formatContext(contextData);

      const systemMessage = `You are BITS Dubai GPT, an intelligent assistant for BITS Pilani Dubai Campus students.
        
        Instructions:
        - Answer the user's question based ONLY on the provided context.
        
        ${unstructuredContext ? `### Knowledge Base Context:\n${unstructuredContext}\n` : ''}
        
        ${contextString ? `### Student/Structured Data:\n${contextString}\n` : ''}
        `;

      const messages = [
        { role: 'system', content: systemMessage },
        ...(conversationHistory || []).map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: query }
      ];

      // 4. Stream Response
      const responseStream = await this.ollamaLlm.chat({
        model: this.llmModel,
        messages: messages,
        stream: true,
      });

      for await (const chunk of responseStream) {
        yield chunk.message.content;
      }

    } catch (error) {
      console.error('LLM Streaming Error:', error);
      yield 'I apologize, but I encountered an error. Please try again later.';
    }
  }

  private formatContext(contextData: any): string {
    if (!contextData || Object.keys(contextData).length === 0) return '';

    // Convert complex objects to readable strings
    try {
      return JSON.stringify(contextData, null, 2);
    } catch {
      return 'Error formatting context data';
    }
  }

  private generateFallbackResponse(query: string, contextData: any): string {
    // Basic fallback logic
    return "I'm sorry, I'm having trouble processing your request right now. Please try again.";
  }
}
