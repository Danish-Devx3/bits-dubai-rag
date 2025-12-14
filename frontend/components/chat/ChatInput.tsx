"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message BITS-GPT...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [message]);

  // Focus textarea on mount (desktop only)
  useEffect(() => {
    if (textareaRef.current && !disabled && window.innerWidth >= 768) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const maxChars = 2000;

  return (
    <div className="sticky bottom-0 p-3 sm:p-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-card/80 backdrop-blur-sm rounded-2xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/60 text-sm leading-relaxed min-h-[24px] max-h-[150px] py-1"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className={`shrink-0 p-2 rounded-xl transition-all ${message.trim() && !disabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground/40'
              }`}
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
