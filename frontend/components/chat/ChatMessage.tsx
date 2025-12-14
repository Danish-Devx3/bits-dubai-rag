"use client";

import { formatDate } from "@/lib/utils";
import { Loader2, RefreshCw, AlertCircle, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { TimetableDisplay } from "./TimetableDisplay";

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
  timetable?: TimetableSchedule[];
  contentType?: 'text' | 'timetable';
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
  metadata,
  timetable,
  contentType = 'text',
}: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative py-3 px-4 md:px-8 transition-all duration-200`}
    >
      <div className={`max-w-3xl mx-auto ${isUser ? 'flex justify-end' : ''}`}>
        {isUser ? (
          /* User Message - Purple bubble aligned right */
          <div className="max-w-[80%]">
            <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm">
              <p className="text-[15px] whitespace-pre-wrap leading-relaxed m-0">{displayContent}</p>
            </div>
          </div>
        ) : (
          /* Assistant Message - Glassmorphism bubble aligned left */
          <div className="max-w-[85%]">
            <div className="bg-card/60 backdrop-blur-md border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              {/* Content */}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {isLoading && !displayContent ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  <div className="markdown-content text-[15px] leading-7">
                    {/* Timetable Display - Show before text content if available */}
                    {timetable && timetable.length > 0 && (
                      <TimetableDisplay schedules={timetable} />
                    )}

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
                            <p className="mb-4 last:mb-0 text-foreground leading-7">{children}</p>
                          );
                        },
                        ul: ({ children }) => (
                          <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground marker:text-muted-foreground">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-6 mb-4 space-y-2 text-foreground marker:text-muted-foreground">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-foreground leading-7 pl-1">{children}</li>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-secondary/80 px-1.5 py-0.5 rounded-md text-[13px] text-foreground font-mono border border-border/50">
                              {children}
                            </code>
                          ) : (
                            <code className={className}>{children}</code>
                          );
                        },
                        pre: ({ children }) => (
                          <pre className="bg-secondary/50 backdrop-blur-sm p-4 rounded-xl overflow-x-auto mb-4 text-sm border border-border/50 shadow-sm">
                            {children}
                          </pre>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-sm">
                            <table className="min-w-full text-sm">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-secondary/50">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="divide-y divide-border/50">{children}</tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-secondary/30 transition-colors">
                            {children}
                          </tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-3 text-foreground">
                            {children}
                          </td>
                        ),
                        strong: ({ children }) => (
                          <strong className="text-foreground font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="text-foreground italic">{children}</em>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h3>
                        ),
                        h4: ({ children }) => (
                          <h4 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h4>
                        ),
                        h5: ({ children }) => (
                          <h5 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">{children}</h5>
                        ),
                        h6: ({ children }) => (
                          <h6 className="text-sm font-medium text-foreground mt-3 mb-1 first:mt-0">{children}</h6>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-primary/5 py-3 rounded-r-lg">
                            {children}
                          </blockquote>
                        ),
                        hr: () => (
                          <hr className="my-6 border-border/50" />
                        ),
                        br: () => (
                          <br className="my-1" />
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline underline-offset-2"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {displayContent}
                    </ReactMarkdown>
                    {/* Typing cursor when streaming */}
                    {isLoading && displayContent && (
                      <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse rounded-full" />
                    )}
                  </div>
                )}

                {/* Action Buttons - Show for assistant messages */}
                {!isUser && !isLoading && displayContent && !hasError && (
                  <div className="flex items-center gap-1 mt-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => setLiked(liked === true ? null : true)}
                      className={`p-1.5 rounded-lg transition-all ${liked === true
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      title="Good response"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      onClick={() => setLiked(liked === false ? null : false)}
                      className={`p-1.5 rounded-lg transition-all ${liked === false
                        ? 'text-red-500 bg-red-500/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                        }`}
                      title="Bad response"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}

                {/* Metadata (timing) */}
                {metadata && metadata.durationFormatted && !isUser && !isLoading && (
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-muted-foreground">
                      ⚡ Generated in {metadata.durationFormatted}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {recommendations && recommendations.length > 0 && !isUser && (
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Related questions</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, index) => (
                        <button
                          key={index}
                          onClick={() => onRecommendationClick?.(rec)}
                          className="px-3 py-2 text-sm bg-secondary/50 hover:bg-secondary text-foreground rounded-xl border border-border/50 hover:border-border transition-all hover:shadow-sm"
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error and Retry UI */}
                {hasError && !isUser && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-500 font-medium">Connection Error</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Unable to get a response. Please check your connection and try again.
                    </p>
                    {canRetry && onRetry && (
                      <Button
                        onClick={onRetry}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all flex items-center gap-2 text-sm disabled:opacity-50 shadow-sm"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Retrying...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Try Again</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
