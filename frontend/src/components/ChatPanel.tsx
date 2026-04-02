import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatAction, TripPlan } from '../types';

// ─── Suggested starter questions ────────────────────────────────────────────

const STARTERS = [
  { emoji: '📅', text: 'Did you consider the day of the week for each venue?' },
  { emoji: '👥', text: 'Which places will be most crowded? Any tips to avoid queues?' },
  { emoji: '🌅', text: 'Are the sunset timings optimised for my trip dates?' },
  { emoji: '💸', text: 'Are there any free entry days I should take advantage of?' },
  { emoji: '🚗', text: 'Is the order of stops on each day efficient for driving?' },
  { emoji: '🌦️', text: 'What should I know about the weather during my trip?' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  plan: TripPlan;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onApplyAction: (action: ChatAction) => void;
  onClearChat: () => void;
}

// ─── Action chip ─────────────────────────────────────────────────────────────

function ActionChip({
  action,
  onApply,
  applied,
}: {
  action: ChatAction;
  onApply: () => void;
  applied: boolean;
}) {
  return (
    <button
      onClick={onApply}
      disabled={applied}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
        applied
          ? 'bg-green-500/20 border-green-500/40 text-green-400 cursor-default'
          : 'bg-ocean-500/15 border-ocean-400/40 text-ocean-300 hover:bg-ocean-500/25 hover:border-ocean-400/70'
      }`}
    >
      {applied ? '✓ Applied' : `✏️ Apply: ${action.description}`}
    </button>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onApplyAction,
}: {
  msg: ChatMessage;
  onApplyAction: (action: ChatAction) => void;
}) {
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-ocean-500/20 border border-ocean-400/30 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          🤖
        </div>
      )}

      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-ocean-500/25 border border-ocean-400/30 text-white rounded-tr-sm'
              : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
          }`}
        >
          {msg.content}
        </div>

        {/* Action chips */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {msg.actions.map((action, idx) => (
              <ActionChip
                key={idx}
                action={action}
                applied={appliedIds.has(idx)}
                onApply={() => {
                  onApplyAction(action);
                  setAppliedIds((prev) => new Set([...prev, idx]));
                }}
              />
            ))}
          </div>
        )}

        <span className="text-[10px] text-gray-600 px-1">
          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
          👤
        </div>
      )}
    </div>
  );
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

export default function ChatPanel({ plan, messages, isLoading, onSendMessage, onApplyAction, onClearChat }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 flex-shrink-0">
        <span className="text-xs font-semibold text-ocean-400 flex-1">💬 Trip Assistant</span>
        <span className="text-[10px] text-gray-500">GPT-4o + web search</span>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages / empty state */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {isEmpty ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center pt-2">
              Ask anything about your plan — day-of-week tips, crowd advice, hidden gems…
            </p>
            <div className="space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => onSendMessage(s.text)}
                  className="w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left bg-white/3 border border-white/8 hover:border-ocean-400/30 hover:bg-white/5 transition-all group"
                >
                  <span className="text-sm flex-shrink-0 mt-0.5">{s.emoji}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-300 leading-relaxed">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onApplyAction={onApplyAction} />
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-ocean-500/20 border border-ocean-400/30 flex items-center justify-center text-sm flex-shrink-0">
              🤖
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-white/10 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your plan…"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-ocean-400 focus:outline-none transition-colors resize-none disabled:opacity-40 leading-relaxed"
            style={{ maxHeight: '96px', overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 96) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-ocean-500 hover:bg-ocean-400 text-white flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0 text-sm"
          >
            {isLoading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              '↑'
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
