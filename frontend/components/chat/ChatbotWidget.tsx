"use client";

import { useState } from "react";
import { MessageSquare, X, Minimize2, Maximize2 } from "lucide-react";
import { ChatInterface } from "./ChatInterface";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function ChatbotWidget() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Lift chat state to widget level so it persists across fullscreen toggles
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsFullScreen(false);
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsFullScreen(false);
  };

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background text-foreground transition-colors duration-300">
        <div className="flex flex-col h-full w-full">
          {/* Header - Fixed at top with high z-index */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm shadow-lg flex-shrink-0 relative z-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                BITS Dubai RAG Assistant
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
              <button
                onClick={toggleFullScreen}
                className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-lg transition-all flex items-center gap-2 shadow-md border border-border min-w-[120px] justify-center"
                title="Minimize to widget"
              >
                <Minimize2 className="w-5 h-5 text-foreground" />
                <span className="text-sm font-bold">Minimize</span>
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 bg-destructive hover:bg-destructive/90 active:bg-destructive text-destructive-foreground font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg border border-destructive min-w-[120px] justify-center"
                title="Close chat"
              >
                <X className="w-5 h-5 text-destructive-foreground font-bold" />
                <span className="text-sm font-bold">Close</span>
              </button>
            </div>
          </div>
          {/* Chat Content - Takes remaining space */}
          <div className="flex-1 overflow-hidden min-h-0 w-full">
            <ChatInterface 
              fullScreen={true} 
              onClose={handleClose}
              messages={messages}
              setMessages={setMessages}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center z-[9998]"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-background rounded-lg shadow-2xl border border-border flex flex-col z-[9999] transition-colors duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm rounded-t-lg flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                RAG Assistant
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
              <button
                onClick={toggleFullScreen}
                className="p-1.5 hover:bg-secondary rounded transition-colors"
                aria-label="Full screen"
                title="Full screen"
              >
                <Maximize2 className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                aria-label="Close chat"
                title="Close chat"
              >
                <X className="w-5 h-5 text-destructive" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            <ChatInterface 
              fullScreen={false} 
              onClose={handleClose}
              messages={messages}
              setMessages={setMessages}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
