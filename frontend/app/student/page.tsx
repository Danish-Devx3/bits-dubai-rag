"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { LogOut, Circle, Plus, DollarSign, GraduationCap, Calendar, BookOpen, CheckCircle, X, PanelLeftClose, PanelLeft, Trash2, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { authApi, unifiedQueryApi, queryApi } from "@/lib/api";

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
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "bits-gpt-student-chats";

export default function StudentPage() {
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = useRef<string>("");

  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 400;

  // Load chat sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChatSessions(parsed);
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
  }, []);

  // Save chat sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Auto-save current chat when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      const nonLoadingMessages = messages.filter(m => !m.isLoading);
      if (nonLoadingMessages.length > 0) {
        setChatSessions(prev =>
          prev.map(session =>
            session.id === currentChatId
              ? {
                ...session,
                messages: nonLoadingMessages,
                title: nonLoadingMessages[0]?.content.slice(0, 35) + (nonLoadingMessages[0]?.content.length > 35 ? "..." : "") || "New Chat",
                updatedAt: new Date().toISOString()
              }
              : session
          )
        );
      }
    }
  }, [messages, currentChatId]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem("user");
        const userType = localStorage.getItem("userType");

        if (!userData || userType !== "student") {
          router.push("/login");
          return;
        }

        const profile = await authApi.getProfile();
        if (profile && profile.role === "student") {
          setUser(profile);
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Hide welcome toast after 5 seconds
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Handle sidebar resizing
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = () => {
    authApi.logout();
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");
    router.push("/login");
  };

  const handleNewChat = () => {
    // Just clear the current chat - a new session will be created when user sends first message
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleSelectChat = (session: ChatSession) => {
    setCurrentChatId(session.id);
    // Convert timestamp strings back to Date objects
    const messagesWithDates = session.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
    setMessages(messagesWithDates);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
    // Update localStorage
    const updated = chatSessions.filter(s => s.id !== chatId);
    if (updated.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Throttled update function for smooth streaming
  const updateMessageContent = (msgId: string, content: string) => {
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
  };

  const handleSend = async (userMessage: string) => {
    // If no current chat, create a new one (like ChatGPT)
    let chatId = currentChatId;
    if (!chatId) {
      chatId = Date.now().toString();
      const newSession: ChatSession = {
        id: chatId,
        title: userMessage.slice(0, 35) + (userMessage.length > 35 ? "..." : ""),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentChatId(chatId);
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
                  } : undefined
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
          } else {
            response = await queryApi.query({
              query: userMessage,
              mode: "mix",
              include_references: false,
            });
          }

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
                recommendations: recommendations.length > 0 ? recommendations : undefined
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
                content: "I'm having trouble connecting to the server. Please try again.",
                isLoading: false
              }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
              ...msg,
              content: "Connection failed. Please try again.",
              isLoading: false,
              hasError: true
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    }
  };

  const suggestionCards = [
    { icon: DollarSign, label: "Outstanding dues" },
    { icon: GraduationCap, label: "Check CGPA" },
    { icon: Calendar, label: "Monday Schedule" },
    { icon: BookOpen, label: "Library Rules" },
  ];

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <aside
        style={{ width: sidebarOpen ? sidebarWidth : 0 }}
        className="flex-shrink-0 border-r border-border/50 flex flex-col relative bg-secondary/30 overflow-hidden transition-[width] duration-500 ease-out"
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 min-w-[200px]">
          <div className="inline-flex items-center justify-center w-9 h-9 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
            <Circle className="w-4 h-4 text-primary fill-primary/30" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-[15px]">BITS-GPT</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-lg transition-all duration-200"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 mb-2 min-w-[200px]">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 rounded-xl text-primary-foreground text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Chat History Section */}
        <div className="px-3 pt-2 min-w-[200px]">
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2 mb-2">Recent</p>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 min-w-[200px] scrollbar-hide">
          {chatSessions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground/60 py-8">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectChat(session)}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 cursor-pointer ${currentChatId === session.id
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-transparent hover:text-foreground'
                    }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-[13px]">{session.title}</span>
                  <button
                    onClick={(e) => handleDeleteChat(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all duration-150"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Section at Bottom */}
        <div className="p-3 border-t border-border/30 min-w-[200px]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-background/60 rounded-lg transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[13px]">Log out</span>
          </button>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors duration-150 ${isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/40'}`}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            {/* Sidebar Toggle Button */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all duration-150"
                title="Open sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-semibold text-primary/80 bg-primary/10 rounded-md uppercase tracking-wide">
              Student
            </span>
            {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 pb-20">
              {/* Main Heading */}
              <div className="mb-8">
                <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                  <Circle className="w-6 h-6 text-primary fill-primary/30" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2 text-center tracking-tight">
                  How can I help you?
                </h1>
                <p className="text-muted-foreground text-center text-[15px]">
                  Ask about your grades, schedule, or campus facilities
                </p>
              </div>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full">
                {suggestionCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(card.label)}
                    className="flex items-center gap-3 p-3.5 bg-secondary/40 hover:bg-secondary/70 rounded-xl border border-border/40 hover:border-border transition-all duration-150 text-left group"
                  >
                    <div className="p-2 bg-background rounded-lg shadow-sm group-hover:shadow transition-shadow">
                      <card.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[13px] text-foreground/90 font-medium">{card.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isLoading={message.isLoading}
                  hasError={message.hasError}
                  canRetry={message.canRetry}
                  recommendations={message.recommendations}
                  onRecommendationClick={(query) => handleSend(query)}
                  metadata={message.metadata}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 pt-2 border-t border-border/30 bg-gradient-to-t from-background to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </main>

      {/* Welcome Toast */}
      {showWelcome && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Welcome back!</span>
            <button
              onClick={() => setShowWelcome(false)}
              className="ml-1 hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

