"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { unifiedQueryApi, queryApi } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  hasError?: boolean;
  canRetry?: boolean;
  retryCount?: number;
  originalQuery?: string; // Store original query for retry
  recommendations?: string[]; // Recommended queries when no context found
  metadata?: {
    duration?: number;
    durationFormatted?: string;
  };
}

interface ChatInterfaceProps {
  fullScreen?: boolean;
  onClose?: () => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading?: boolean;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ChatInterface({
  fullScreen = false,
  onClose,
  messages: externalMessages,
  setMessages: externalSetMessages,
  isLoading: externalIsLoading,
  setIsLoading: externalSetIsLoading,
}: ChatInterfaceProps) {
  // Use external state if provided, otherwise use internal state
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  
  const messages = externalMessages ?? internalMessages;
  const setMessages = externalSetMessages ?? setInternalMessages;
  const isLoading = externalIsLoading ?? internalIsLoading;
  const setIsLoading = externalSetIsLoading ?? setInternalIsLoading;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<string>("");
  const autoRetryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Throttled update function for smooth streaming
  const updateMessageContent = useCallback((msgId: string, content: string) => {
    pendingContentRef.current = content;
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, content: pendingContentRef.current, isLoading: false }
            : msg
        )
      );
      pendingContentRef.current = "";
    }, 16); // ~60fps updates
  }, [setMessages]);

  // Function to retry a failed query
  const retryQuery = useCallback(async (messageId: string, originalQuery: string, retryCount: number = 0) => {
    if (retryCount >= 3) {
      // Max 3 retries
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, canRetry: false, hasError: true }
            : msg
        )
      );
      return;
    }

    // Clear any existing auto-retry timer for this message
    const existingTimer = autoRetryTimersRef.current.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      autoRetryTimersRef.current.delete(messageId);
    }

    // Update message to show retrying
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              isLoading: true,
              hasError: false,
              canRetry: false,
              content: "",
              retryCount: retryCount + 1,
            }
          : msg
      )
    );

    setIsLoading(true);
    const assistantMsgId = messageId;

           try {
             let fullResponse = "";
             let hasContent = false;

             try {
               let chunkCount = 0;
               for await (const chunk of queryApi.queryStream({
                 query: originalQuery,
                 mode: "mix",
               })) {
          if (chunk && chunk.trim()) {
            chunkCount++;
            fullResponse += chunk;
            hasContent = true;
            updateMessageContent(assistantMsgId, fullResponse);
          }
        }

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        if (chunkCount > 0 && fullResponse.trim()) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: fullResponse.trim(),
                    isLoading: false,
                    hasError: false,
                    canRetry: false,
                  }
                : msg
            )
          );
        } else if (!hasContent || !fullResponse.trim()) {
          throw new Error("No content from stream");
        }
      } catch (streamError: any) {
               console.warn("Streaming failed, falling back to regular query:", streamError);
               try {
                 const response = await queryApi.query({
                   query: originalQuery,
                   mode: "mix",
                   include_references: false,
                 });

          if (response && response.response) {
            fullResponse = response.response;
            hasContent = true;
          } else if (response && typeof response === "string") {
            fullResponse = response;
            hasContent = true;
          } else if (response && response.message) {
            fullResponse = response.message;
            hasContent = true;
          }
        } catch (queryError: any) {
          console.error("Fallback query also failed:", queryError);
          throw queryError;
        }
      }

      if (hasContent && fullResponse.trim()) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: fullResponse.trim(),
                  isLoading: false,
                  hasError: false,
                  canRetry: false,
                }
              : msg
          )
        );
      } else {
        throw new Error("No content received");
      }
    } catch (error: any) {
      console.error("Retry failed:", error);
      const errorMessage = error.message || "Connection failed. The server may be temporarily unavailable.";
      
      // Schedule automatic retry after 2-3 minutes (randomized between 120-180 seconds)
      const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `${errorMessage}\n\n🔄 Automatic retry scheduled in ${Math.round(retryDelay / 1000 / 60)} minutes...`,
                isLoading: false,
                hasError: true,
                canRetry: true,
                retryCount: retryCount + 1,
              }
            : msg
        )
      );

      // Schedule automatic retry
      const autoRetryTimer = setTimeout(() => {
        retryQuery(assistantMsgId, originalQuery, retryCount + 1);
      }, retryDelay);

      autoRetryTimersRef.current.set(assistantMsgId, autoRetryTimer);
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, setIsLoading, updateMessageContent]);

  const handleSend = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    
    const assistantMsgId = Date.now().toString() + "1";

    // Create placeholder message for streaming with loading state
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Try streaming first
      let fullResponse = "";
      let hasContent = false;
      let recommendations: string[] = [];
      
      try {
        let chunkCount = 0;
        let responseMetadata: any = null;
        // Try unified query first (for ERP/LMS), fallback to direct LightRAG
        const user = localStorage.getItem("user");
        if (user) {
          // Use unified query API (routes through backend for classification)
          for await (const chunk of unifiedQueryApi.queryStream(userMessage)) {
            // Check if this is metadata
            try {
              const parsed = JSON.parse(chunk);
              if (parsed.type === 'metadata') {
                responseMetadata = parsed;
                continue;
              }
            } catch (e) {
              // Not JSON, treat as content
            }
            
            if (chunk && chunk.trim()) {
              chunkCount++;
              fullResponse += chunk;
              hasContent = true;
              updateMessageContent(assistantMsgId, fullResponse);
            }
          }
          
          // Get recommendations from non-streaming API
          try {
            const queryResult = await unifiedQueryApi.query(userMessage);
            if (queryResult.recommendations && Array.isArray(queryResult.recommendations)) {
              recommendations = queryResult.recommendations;
            }
          } catch (e) {
            // Ignore errors getting recommendations
            console.log("Could not fetch recommendations:", e);
          }
        } else {
          // Use direct LightRAG API
          for await (const chunk of queryApi.queryStream({
            query: userMessage,
            mode: "mix",
          })) {
            if (chunk && chunk.trim()) {
              chunkCount++;
              fullResponse += chunk;
              hasContent = true;
              updateMessageContent(assistantMsgId, fullResponse);
            }
          }
        }
        
        // Final update with all content
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // If we got chunks but no final content, use what we have
        if (chunkCount > 0 && fullResponse.trim()) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { 
                    ...msg, 
                    content: fullResponse.trim(), 
                    isLoading: false,
                    recommendations: recommendations.length > 0 ? recommendations : undefined,
                    metadata: responseMetadata ? {
                      duration: responseMetadata.duration,
                      durationFormatted: responseMetadata.durationFormatted
                    } : undefined
                  }
                : msg
            )
          );
        } else if (!hasContent || !fullResponse.trim()) {
          // If streaming didn't yield content, try fallback
          console.warn("Streaming yielded no content, trying fallback query");
          throw new Error("No content from stream");
        }
      } catch (streamError: any) {
        console.warn("Streaming failed, falling back to regular query:", streamError);
        // Fallback to regular query API
        try {
          const user = localStorage.getItem("user");
          let response;
          if (user) {
            // Use unified query API
            response = await unifiedQueryApi.query(userMessage);
            if (response && response.response) {
              fullResponse = response.response;
              hasContent = true;
            }
            if (response && response.recommendations && Array.isArray(response.recommendations)) {
              recommendations = response.recommendations;
            }
          } else {
            // Use direct LightRAG API
            response = await queryApi.query({
              query: userMessage,
              mode: "mix",
              include_references: false,
            });
          }
          
          console.log("Fallback query response:", response);
          
          if (response && response.response) {
            fullResponse = response.response;
            hasContent = true;
          } else if (response && typeof response === "string") {
            fullResponse = response;
            hasContent = true;
          } else if (response && response.message) {
            fullResponse = response.message;
            hasContent = true;
          }
        } catch (queryError: any) {
          console.error("Fallback query also failed:", queryError);
          throw queryError;
        }
      }

      // Finalize the message
      if (hasContent && fullResponse.trim()) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { 
                  ...msg, 
                  content: fullResponse.trim(), 
                  isLoading: false,
                  recommendations: recommendations.length > 0 ? recommendations : undefined
                }
              : msg
          )
        );
      } else {
        // If still no content, show error message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { 
                  ...msg, 
                  content: "I'm having trouble connecting to the server. Please check if the RAG server is running and try again.",
                  isLoading: false
                }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage = error.message || "Connection failed. The server may be temporarily unavailable.";
      
      // Schedule automatic retry after 2-3 minutes (randomized between 120-180 seconds)
      const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
      const retryMinutes = Math.round(retryDelay / 1000 / 60);
      
      const errorMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: `${errorMessage}\n\n🔄 Automatic retry scheduled in ${retryMinutes} minutes. You can also retry manually using the button below.`,
        timestamp: new Date(),
        isLoading: false,
        hasError: true,
        canRetry: true,
        retryCount: 0,
        originalQuery: userMessage,
      };
      
      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMsgId ? errorMsg : msg))
      );

      // Schedule automatic retry
      const autoRetryTimer = setTimeout(() => {
        retryQuery(assistantMsgId, userMessage, 0);
      }, retryDelay);

      autoRetryTimersRef.current.set(assistantMsgId, autoRetryTimer);
    } finally {
      setIsLoading(false);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      // Clear all auto-retry timers
      autoRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoRetryTimersRef.current.clear();
    };
  }, []);

  return (
    <div
      className="flex flex-col h-full w-full bg-white"
      ref={chatContainerRef}
    >
      {/* Messages Container - ChatGPT Style */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-4xl font-semibold text-gray-900 mb-3 text-center">
                How can I help you today?
              </h2>
              <p className="text-gray-600 mb-8 text-center max-w-md">
                Ask me anything about courses, syllabus, assignments, or university information.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                {[
                  "What is the syllabus for 3rd year CSE this semester?",
                  "Tell me about the assignment deadlines",
                  "What are the course requirements?",
                  "Explain the grading system",
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(example)}
                    className="text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all text-sm text-gray-700 font-medium hover:shadow-sm"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              isLoading={message.isLoading}
              hasError={message.hasError}
              canRetry={message.canRetry}
              onRetry={message.canRetry && message.originalQuery ? () => retryQuery(message.id, message.originalQuery!, message.retryCount || 0) : undefined}
              recommendations={message.recommendations}
              onRecommendationClick={(query) => handleSend(query)}
              metadata={message.metadata}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
