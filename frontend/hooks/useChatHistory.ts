"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi, ChatSession as ApiChatSession, ChatMessage as ApiChatMessage } from '@/lib/api';

// Extended message type for frontend use with Date objects
export interface Message {
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

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}

interface UseChatHistoryOptions {
    onError?: (error: Error) => void;
}

/**
 * Hook for managing secure, user-specific chat history
 * - Syncs with backend API for persistence
 * - Falls back to user-specific localStorage if API fails
 * - Ensures complete isolation between users
 */
export function useChatHistory(options: UseChatHistoryOptions = {}) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Ref to track if we're using localStorage fallback
    const usingLocalStorage = useRef(false);

    // Get user-specific storage key for localStorage fallback
    const getStorageKey = useCallback(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const parsed = JSON.parse(user);
                // Use user ID for unique storage key - ensures isolation
                return `bits-gpt-chats-${parsed.id}`;
            } catch {
                return null;
            }
        }
        return null;
    }, []);

    // Convert API message to frontend Message format
    const convertApiMessage = useCallback((msg: ApiChatMessage): Message => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        hasError: msg.hasError,
        recommendations: msg.recommendations,
        metadata: msg.metadata as Message['metadata'],
    }), []);

    // Convert API session to frontend ChatSession format
    const convertApiSession = useCallback((session: ApiChatSession): ChatSession => ({
        id: session.id,
        title: session.title,
        messages: session.messages.map(convertApiMessage),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    }), [convertApiMessage]);

    // Load sessions from backend or localStorage fallback
    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Try to fetch from backend API
            const apiSessions = await chatApi.getSessions();
            const convertedSessions = apiSessions.map(convertApiSession);
            setSessions(convertedSessions);
            usingLocalStorage.current = false;
        } catch (err) {
            console.warn('Failed to load chat sessions from API, using localStorage fallback:', err);

            // Fallback to localStorage with user-specific key
            const storageKey = getStorageKey();
            if (storageKey) {
                try {
                    const saved = localStorage.getItem(storageKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        // Convert timestamps back to Date objects
                        const convertedSessions = parsed.map((s: any) => ({
                            ...s,
                            messages: s.messages.map((m: any) => ({
                                ...m,
                                timestamp: new Date(m.timestamp),
                            })),
                        }));
                        setSessions(convertedSessions);
                    }
                } catch (parseError) {
                    console.error('Failed to parse localStorage chat history:', parseError);
                }
            }
            usingLocalStorage.current = true;
            setError(err as Error);
            options.onError?.(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [convertApiSession, getStorageKey, options]);

    // Initial load
    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Save to localStorage as backup (with user-specific key)
    const saveToLocalStorage = useCallback((sessionsToSave: ChatSession[]) => {
        const storageKey = getStorageKey();
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(sessionsToSave));
        }
    }, [getStorageKey]);

    // Create a new chat session
    const createSession = useCallback(async (firstMessage: string): Promise<string> => {
        const title = firstMessage.slice(0, 35) + (firstMessage.length > 35 ? '...' : '');

        try {
            if (!usingLocalStorage.current) {
                // Create on backend
                const newSession = await chatApi.createSession({ title, messages: [] });
                const converted = convertApiSession(newSession);
                setSessions(prev => [converted, ...prev]);
                return newSession.id;
            }
        } catch (err) {
            console.warn('Failed to create session on API, using local:', err);
            usingLocalStorage.current = true;
        }

        // LocalStorage fallback
        const localId = Date.now().toString();
        const newSession: ChatSession = {
            id: localId,
            title,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setSessions(prev => {
            const updated = [newSession, ...prev];
            saveToLocalStorage(updated);
            return updated;
        });

        return localId;
    }, [convertApiSession, saveToLocalStorage]);

    // Add a message to a session
    const addMessage = useCallback(async (
        sessionId: string,
        message: Omit<Message, 'id' | 'timestamp'> & { timestamp?: Date }
    ): Promise<Message> => {
        const newMessage: Message = {
            ...message,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: message.timestamp || new Date(),
        };

        // Update local state immediately for responsiveness
        setMessages(prev => [...prev, newMessage]);
        setSessions(prev => {
            const updated = prev.map(s =>
                s.id === sessionId
                    ? {
                        ...s,
                        messages: [...s.messages, newMessage],
                        updatedAt: new Date().toISOString(),
                        title: s.messages.length === 0 && message.role === 'user'
                            ? message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '')
                            : s.title,
                    }
                    : s
            );
            saveToLocalStorage(updated);
            return updated;
        });

        // Don't sync loading messages to backend
        if (message.isLoading) {
            return newMessage;
        }

        try {
            if (!usingLocalStorage.current) {
                // Sync to backend
                await chatApi.addMessage(sessionId, {
                    role: message.role,
                    content: message.content,
                    hasError: message.hasError,
                    recommendations: message.recommendations,
                    metadata: message.metadata,
                });
            }
        } catch (err) {
            console.warn('Failed to sync message to API:', err);
            // Message is already saved locally, so we can continue
        }

        return newMessage;
    }, [saveToLocalStorage]);

    // Update a message (useful for streaming content updates)
    const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        );

        // Also update in sessions
        setSessions(prev => {
            const updated = prev.map(s => ({
                ...s,
                messages: s.messages.map(m =>
                    m.id === messageId ? { ...m, ...updates } : m
                ),
            }));

            // Only save non-loading states to localStorage
            if (!updates.isLoading) {
                saveToLocalStorage(updated);
            }

            return updated;
        });
    }, [saveToLocalStorage]);

    // Select a chat session
    const selectSession = useCallback((sessionId: string | null) => {
        setCurrentSessionId(sessionId);

        if (sessionId) {
            const session = sessions.find(s => s.id === sessionId);
            if (session) {
                setMessages(session.messages);
            }
        } else {
            setMessages([]);
        }
    }, [sessions]);

    // Delete a chat session
    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            if (!usingLocalStorage.current) {
                await chatApi.deleteSession(sessionId);
            }
        } catch (err) {
            console.warn('Failed to delete session from API:', err);
        }

        setSessions(prev => {
            const updated = prev.filter(s => s.id !== sessionId);

            if (updated.length === 0) {
                const storageKey = getStorageKey();
                if (storageKey) {
                    localStorage.removeItem(storageKey);
                }
            } else {
                saveToLocalStorage(updated);
            }

            return updated;
        });

        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
            setMessages([]);
        }
    }, [currentSessionId, getStorageKey, saveToLocalStorage]);

    // Start a new chat (clear current selection)
    const startNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
    }, []);

    // Get the current session
    const currentSession = currentSessionId
        ? sessions.find(s => s.id === currentSessionId)
        : null;

    return {
        // State
        sessions,
        currentSessionId,
        currentSession,
        messages,
        isLoading,
        error,

        // Actions
        createSession,
        addMessage,
        updateMessage,
        selectSession,
        deleteSession,
        startNewChat,
        refresh: loadSessions,

        // Utilities
        setMessages, // Direct access for complex updates
    };
}
