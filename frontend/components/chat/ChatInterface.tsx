"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { unifiedQueryApi, queryApi } from "@/lib/api";
import { Sparkles, BookOpen, Calendar, GraduationCap, HelpCircle, Trash2, X, Zap } from "lucide-react";

interface TimetableSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  type: string;
  course: {
    courseCode: string;
    courseName: string;
    department: string;
    credits: number;
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  hasError?: boolean;
  canRetry?: boolean;
  retryCount?: number;
  originalQuery?: string;
  recommendations?: string[];
  metadata?: {
    duration?: number;
    durationFormatted?: string;
  };
  timetable?: TimetableSchedule[];
  contentType?: 'text' | 'timetable';
}

interface ChatInterfaceProps {
  fullScreen?: boolean;
  onClose?: () => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading?: boolean;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
}

const suggestionCards = [
  {
    icon: BookOpen,
    title: "Course Syllabus",
    description: "What is the syllabus for 3rd year CSE?",
  },
  {
    icon: Calendar,
    title: "Assignment Deadlines",
    description: "Tell me about upcoming assignment deadlines",
  },
  {
    icon: GraduationCap,
    title: "Course Requirements",
    description: "What are the course requirements?",
  },
  {
    icon: HelpCircle,
    title: "Grading System",
    description: "Explain the grading system",
  },
];

// Welcome Toast Component
function WelcomeToast({ onDismiss, userName }: { onDismiss: () => void; userName?: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 max-w-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2.5 bg-primary rounded-xl">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              Welcome back{userName ? `, ${userName}` : ''}! 👋
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ready to help with your BITS Dubai questions.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({
  fullScreen = false,
  onClose,
  messages: externalMessages,
  setMessages: externalSetMessages,
  isLoading: externalIsLoading,
  setIsLoading: externalSetIsLoading,
}: ChatInterfaceProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [userName, setUserName] = useState<string | undefined>();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const messages = externalMessages ?? internalMessages;
  const setMessages = externalSetMessages ?? setInternalMessages;
  const isLoading = externalIsLoading ?? internalIsLoading;
  const setIsLoading = externalSetIsLoading ?? setInternalIsLoading;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<string>("");
  const autoRetryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Show welcome toast on mount
  useEffect(() => {
    const hasSeenToast = sessionStorage.getItem('chatWelcomeToastSeen');
    if (!hasSeenToast && messages.length === 0) {
      // Get user name from localStorage if available
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setUserName(user.name || user.email?.split('@')[0]);
        }
      } catch (e) {
        // Ignore parsing errors
      }

      const timer = setTimeout(() => {
        setShowWelcomeToast(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const dismissWelcomeToast = () => {
    setShowWelcomeToast(false);
    sessionStorage.setItem('chatWelcomeToastSeen', 'true');
  };

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (showWelcomeToast) {
      const timer = setTimeout(() => {
        dismissWelcomeToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeToast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    }, 16);
  }, [setMessages]);

  const clearChat = () => {
    setMessages([]);
    // Clear auto-retry timers
    autoRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
    autoRetryTimersRef.current.clear();
    setShowConfirmClear(false);
  };

  const retryQuery = useCallback(async (messageId: string, originalQuery: string, retryCount: number = 0) => {
    if (retryCount >= 3) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, canRetry: false, hasError: true }
            : msg
        )
      );
      return;
    }

    const existingTimer = autoRetryTimersRef.current.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      autoRetryTimersRef.current.delete(messageId);
    }

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

      const retryDelay = 120000 + Math.random() * 60000;

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

      const autoRetryTimer = setTimeout(() => {
        retryQuery(assistantMsgId, originalQuery, retryCount + 1);
      }, retryDelay);

      autoRetryTimersRef.current.set(assistantMsgId, autoRetryTimer);
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, setIsLoading, updateMessageContent]);

  const handleSend = async (userMessage: string) => {
    // Dismiss welcome toast when user sends first message
    if (showWelcomeToast) {
      dismissWelcomeToast();
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantMsgId = Date.now().toString() + "1";

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      let fullResponse = "";
      let hasContent = false;
      let recommendations: string[] = [];
      let timetableData: TimetableSchedule[] | undefined = undefined;
      let contentType: 'text' | 'timetable' = 'text';

      try {
        let chunkCount = 0;
        let responseMetadata: any = null;
        const user = localStorage.getItem("user");
        if (user) {
          for await (const chunk of unifiedQueryApi.queryStream(userMessage)) {
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

          try {
            const queryResult = await unifiedQueryApi.query(userMessage);
            if (queryResult.recommendations && Array.isArray(queryResult.recommendations)) {
              recommendations = queryResult.recommendations;
            }
            // Capture timetable data if present
            if (queryResult.timetable && Array.isArray(queryResult.timetable) && queryResult.timetable.length > 0) {
              timetableData = queryResult.timetable;
              contentType = 'timetable';
            }
          } catch (e) {
            console.log("Could not fetch recommendations:", e);
          }
        } else {
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
                  recommendations: recommendations.length > 0 ? recommendations : undefined,
                  metadata: responseMetadata ? {
                    duration: responseMetadata.duration,
                    durationFormatted: responseMetadata.durationFormatted
                  } : undefined,
                  timetable: timetableData,
                  contentType: contentType,
                }
                : msg
            )
          );
        } else if (!hasContent || !fullResponse.trim()) {
          console.warn("Streaming yielded no content, trying fallback query");
          throw new Error("No content from stream");
        }
      } catch (streamError: any) {
        console.warn("Streaming failed, falling back to regular query:", streamError);
        try {
          const user = localStorage.getItem("user");
          let response;
          if (user) {
            response = await unifiedQueryApi.query(userMessage);
            if (response && response.response) {
              fullResponse = response.response;
              hasContent = true;
            }
            if (response && response.recommendations && Array.isArray(response.recommendations)) {
              recommendations = response.recommendations;
            }
            // Capture timetable in fallback path
            if (response && response.timetable && Array.isArray(response.timetable) && response.timetable.length > 0) {
              timetableData = response.timetable;
              contentType = 'timetable';
            }
          } else {
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

      if (hasContent && fullResponse.trim()) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                ...msg,
                content: fullResponse.trim(),
                isLoading: false,
                recommendations: recommendations.length > 0 ? recommendations : undefined,
                timetable: timetableData,
                contentType: contentType,
              }
              : msg
          )
        );
      } else {
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

      const retryDelay = 120000 + Math.random() * 60000;
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

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      autoRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
      autoRetryTimersRef.current.clear();
    };
  }, []);

  return (
    <div
      className="flex flex-col h-full w-full bg-background text-foreground transition-colors duration-300"
      ref={chatContainerRef}
    >
      {/* Theme Toggle - Fixed Position (only when fullScreen) */}
      {fullScreen && mounted && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center justify-center min-h-full py-12 px-4">
            {/* Logo */}
            <div className="mb-8 relative">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

            {/* Greeting */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-center">
              How can I help you?
            </h1>
            <p className="text-muted-foreground mb-10 text-center max-w-md">
              Ask me anything about BITS Dubai - courses, deadlines, or campus life.
            </p>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestionCards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(card.description)}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200 text-left"
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <card.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{card.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="pb-4">
            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <div className="sticky top-2 z-10 flex justify-end px-4">
                <div className="relative">
                  <button
                    onClick={() => setShowConfirmClear(!showConfirmClear)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary/80 backdrop-blur-sm hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full transition-all border border-border/50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>

                  {/* Confirmation Popup */}
                  {showConfirmClear && (
                    <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-3 min-w-[200px] z-50">
                      <p className="text-sm text-foreground mb-3">Clear all chat history?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowConfirmClear(false)}
                          className="flex-1 px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={clearChat}
                          className="flex-1 px-3 py-1.5 text-xs bg-destructive hover:bg-destructive/90 text-white rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
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
                timetable={message.timetable}
                contentType={message.contentType}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />

      {/* Welcome Toast */}
      {showWelcomeToast && (
        <WelcomeToast onDismiss={dismissWelcomeToast} userName={userName} />
      )}
    </div>
  );
}
