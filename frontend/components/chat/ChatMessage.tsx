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
  onRecommendationClick
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
      className={`flex gap-4 py-4 px-4 md:px-6 ${
        isUser ? "bg-white" : "bg-gray-50"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-white"
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
        <div className="prose prose-sm max-w-none">
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">{displayContent}</p>
          ) : isLoading && !displayContent ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
              <span className="text-sm text-gray-600">Thinking...</span>
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
                      <p className="mb-3 last:mb-0 text-gray-800 leading-7">{children}</p>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-3 space-y-1.5 text-gray-900 font-medium ml-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-1.5 text-gray-900 font-medium ml-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-900 font-medium leading-6">{children}</li>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-900 font-mono font-semibold">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-3 text-sm border border-gray-300">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 -mx-2 px-2">
                      <table className="min-w-full border-collapse border border-gray-300 text-sm bg-white rounded-lg shadow-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-100">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-gray-200">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900 bg-gray-100 text-xs uppercase tracking-wider whitespace-nowrap">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 px-4 py-2.5 text-gray-800 text-sm">
                      {children}
                    </td>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-gray-900 font-bold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-gray-900 font-medium italic">{children}</em>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3 first:mt-0 border-b border-gray-300 pb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3 first:mt-0 border-b border-gray-200 pb-1.5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-bold text-gray-900 mt-3 mb-2 first:mt-0">{children}</h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-sm font-bold text-gray-900 mt-2 mb-1.5 first:mt-0">{children}</h5>
                  ),
                  h6: ({ children }) => (
                    <h6 className="text-sm font-semibold text-gray-900 mt-2 mb-1.5 first:mt-0">{children}</h6>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 my-3 italic text-gray-700 bg-blue-50 py-2 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-4 border-gray-300" />
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
                <span className="inline-block w-0.5 h-4 bg-gray-600 ml-1 animate-pulse" />
              )}
            </div>
          )}
          
          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && !isUser && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">You might want to try:</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((rec, index) => (
                  <button
                    key={index}
                    onClick={() => onRecommendationClick?.(rec)}
                    className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors font-medium"
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error and Retry UI */}
          {hasError && !isUser && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">Connection Error</span>
              </div>
              {canRetry && onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
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
