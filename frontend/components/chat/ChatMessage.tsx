"use client";

import { formatDate } from "@/lib/utils";
import { User, Bot, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
  hasError?: boolean;
  canRetry?: boolean;
  onRetry?: () => void;
  recommendations?: string[];
  onRecommendationClick?: (query: string) => void;
  metadata?: {
    duration?: number;
    durationFormatted?: string;
  };
}

export function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  isLoading = false,
  hasError = false,
  canRetry = false,
  onRetry,
  recommendations = [],
  onRecommendationClick,
  metadata
}: ChatMessageProps) {
  const isUser = role === "user";
  
  // Normalize markdown content - ensure proper formatting
  const normalizeMarkdown = (text: string): string => {
    if (!text) return text;
    
    let normalized = text
      // Fix inline bullet points that appear after text (e.g., "dates:*   item")
      .replace(/([^\n])(\*)\s+/g, '$1\n\n$2 ')
      .replace(/([^\n])(-)\s+(?=\w)/g, '$1\n\n$2 ')
      // Fix headers that might be inline - ensure they start on new line with spacing
      .replace(/([^\n])(#{1,6})\s+/g, '$1\n\n$2 ')
      // Ensure proper spacing before headers
      .replace(/([^\n])\n(#{1,6})\s+/g, '$1\n\n$2 ')
      // Ensure spacing after headers
      .replace(/(#{1,6}[^\n]+)\n([^\n#\s])/g, '$1\n\n$2')
      // Fix bullet points that need spacing before them
      .replace(/([^\n])\n\*\s+/g, '$1\n\n* ')
      .replace(/([^\n])\n-\s+/g, '$1\n\n- ')
      .replace(/([^\n])\n\+\s+/g, '$1\n\n+ ')
      // Fix numbered lists
      .replace(/([^\n])\n(\d+\.)\s+/g, '$1\n\n$2 ')
      // Normalize multiple spaces in list items (e.g., "*   item" -> "* item")
      .replace(/\*\s{3,}/g, '* ')
      .replace(/-\s{3,}/g, '- ')
      .replace(/\+\s{3,}/g, '+ ')
      // Ensure list items are properly grouped (no extra newlines between consecutive items)
      .replace(/(\n[*\-+]\s[^\n]+)\n\n([*\-+]\s)/g, '$1\n$2')
      .replace(/(\n\d+\.\s[^\n]+)\n\n(\d+\.\s)/g, '$1\n$2')
      // Fix spacing around References section
      .replace(/([^\n])\n(###\s+References)/g, '$1\n\n$2')
      // Normalize excessive newlines (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Trim whitespace
      .trim();
    
    return normalized;
  };
  
  const [displayContent, setDisplayContent] = useState(normalizeMarkdown(content));
  const prevContentRef = useRef(content);
  const isStreamingRef = useRef(false);

  // Smooth content updates for streaming
  useEffect(() => {
    if (content !== prevContentRef.current) {
      // If content is growing (streaming), update smoothly
      if (content.length > prevContentRef.current.length) {
        isStreamingRef.current = true;
        // During streaming, don't normalize too aggressively to avoid flickering
        setDisplayContent(content);
      } else {
        // If content changed completely, normalize markdown
        setDisplayContent(normalizeMarkdown(content));
      }
      prevContentRef.current = content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Reset streaming flag when content stops changing
  useEffect(() => {
    if (isStreamingRef.current && !isLoading) {
      const timer = setTimeout(() => {
        isStreamingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [content, isLoading]);
  
  return (
    <div
      className={`flex gap-4 py-4 px-4 md:px-6 transition-colors duration-300 ${
        isUser ? "bg-background" : "bg-secondary/30"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{displayContent}</p>
          ) : isLoading && !displayContent ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  p: ({ children }) => {
                    // Don't render empty paragraphs
                    if (!children || (Array.isArray(children) && children.length === 0)) {
                      return null;
                    }
                    // Check if it's just whitespace
                    const text = typeof children === 'string' ? children : 
                                 Array.isArray(children) ? children.join('') : '';
                    if (!text.trim()) {
                      return null;
                    }
                    return (
                      <p className="mb-3 last:mb-0 text-foreground leading-7">{children}</p>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-3 space-y-1.5 text-foreground font-medium ml-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-1.5 text-foreground font-medium ml-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground font-medium leading-6">{children}</li>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-secondary px-1.5 py-0.5 rounded text-xs text-foreground font-mono font-semibold">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-secondary p-4 rounded-lg overflow-x-auto mb-3 text-sm border border-border">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 -mx-2 px-2">
                      <table className="min-w-full border-collapse border border-border text-sm bg-card rounded-lg shadow-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-secondary">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-border">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-4 py-3 text-left font-bold text-foreground bg-secondary text-xs uppercase tracking-wider whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-4 py-2.5 text-foreground text-sm">
                      {children}
                    </td>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-foreground font-bold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-foreground font-medium italic">{children}</em>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-foreground mt-6 mb-3 first:mt-0 border-b border-border pb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-foreground mt-5 mb-3 first:mt-0 border-b border-border pb-1.5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-bold text-foreground mt-3 mb-2 first:mt-0">{children}</h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-sm font-bold text-foreground mt-2 mb-1.5 first:mt-0">{children}</h5>
                  ),
                  h6: ({ children }) => (
                    <h6 className="text-sm font-semibold text-foreground mt-2 mb-1.5 first:mt-0">{children}</h6>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 my-3 italic text-muted-foreground bg-primary/10 py-2 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-4 border-border" />
                  ),
                  br: () => (
                    <br className="my-1" />
                  ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
              {/* Typing cursor when streaming */}
              {isLoading && displayContent && (
                <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse" />
              )}
            </div>
          )}
          
          {/* Metadata (timing) */}
          {metadata && metadata.durationFormatted && !isUser && !isLoading && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                Generated in {metadata.durationFormatted}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && !isUser && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-2">You might want to try:</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((rec, index) => (
                  <button
                    key={index}
                    onClick={() => onRecommendationClick?.(rec)}
                    className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 transition-colors font-medium"
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error and Retry UI */}
          {hasError && !isUser && (
            <div className="mt-4 pt-4 border-t border-destructive/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Connection Error</span>
              </div>
              {canRetry && onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
