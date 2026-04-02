import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ChatAction, TripPlan } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function uuid(): string {
  return crypto.randomUUID();
}

export interface UseChat {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, plan: TripPlan) => Promise<void>;
  clearChat: () => void;
}

/**
 * Manages the trip-assistant conversation state.
 * Sends messages to /api/planner/chat and accumulates the history.
 */
export function useChat(): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the current message list for the send callback
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (text: string, plan: TripPlan) => {
    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    // History to send: all previous messages + the one we just added
    const history = [...messagesRef.current, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await fetch(`${API_BASE}/api/planner/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, plan }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${resp.status}`);
      }

      const data = (await resp.json()) as { message: string; actions?: ChatAction[] };

      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: data.message,
        actions: data.actions,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat request failed';
      setError(msg);

      // Show error as an assistant message so the UI is clean
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: 'assistant',
          content: `⚠️ ${msg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
