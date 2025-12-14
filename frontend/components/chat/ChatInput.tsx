"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your question...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-4 py-3 pr-12 border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground bg-background text-sm"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="p-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
