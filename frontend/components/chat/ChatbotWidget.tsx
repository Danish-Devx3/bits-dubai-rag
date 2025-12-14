"use client";

import { useState } from "react";
import { MessageSquare, X, Minimize2, Maximize2, Sparkles } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/95 backdrop-blur-md shadow-sm flex-shrink-0 relative z-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  BITS Assistant
                </h2>
                <p className="text-xs text-muted-foreground">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
              <button
                onClick={toggleFullScreen}
                className="p-2.5 hover:bg-secondary rounded-xl transition-all flex items-center gap-2 text-muted-foreground hover:text-foreground"
                title="Minimize to widget"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleClose}
                className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all text-muted-foreground hover:text-red-500"
                title="Close chat"
              >
                <X className="w-5 h-5" />
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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="fixed bottom-6 right-6 group z-[9998]"
          aria-label="Open chat"
        >
          {/* Pulse Animation Ring */}
          <div className="absolute inset-0 w-14 h-14 bg-primary rounded-full animate-ping opacity-20" />

          {/* Button */}
          <div className={`relative w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${isHovered ? 'scale-110 shadow-2xl shadow-primary/30' : ''
            }`}>
            <Sparkles className={`w-6 h-6 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
          </div>

          {/* Tooltip */}
          <div className={`absolute bottom-full right-0 mb-3 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}>
            Chat with BITS Assistant
            <div className="absolute bottom-0 right-4 translate-y-1/2 rotate-45 w-2 h-2 bg-foreground" />
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[650px] bg-background rounded-2xl shadow-2xl border border-border flex flex-col z-[9999] overflow-hidden transition-all duration-300 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-primary rounded-lg shadow-md">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  BITS Assistant
                </h3>
                <p className="text-[10px] text-muted-foreground">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mounted && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
              <button
                onClick={toggleFullScreen}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Full screen"
                title="Full screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                aria-label="Close chat"
                title="Close chat"
              >
                <X className="w-4 h-4" />
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
