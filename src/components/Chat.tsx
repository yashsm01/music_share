'use client';

import { useState, useRef, useEffect } from 'react';
import { IMessage } from '@/lib/types';

interface ChatProps {
  messages: IMessage[];
  currentUserId: string | null;
  onSendMessage: (message: string) => void;
}

const EMOJI_LIST = ['😀', '😂', '❤️', '🔥', '🎵', '🎶', '👏', '🙌', '💜', '✨', '🎧', '🎸', '🥁', '🎤', '💃', '🕺'];

export default function Chat({ messages, currentUserId, onSendMessage }: ChatProps) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
    setShowEmojis(false);
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-3 sm:px-4 py-2.5 border-b border-white/[0.06]">
        <h2 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 py-2.5 space-y-2.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-center">
            <svg className="w-7 h-7 text-white/15 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs text-white/25">No messages yet</p>
            <p className="text-[10px] text-white/15 mt-0.5">Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg._id} className="flex justify-center">
                  <span className="text-[10px] text-white/25 bg-white/[0.03] px-2.5 py-0.5 rounded-full">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isOwn = msg.userId === currentUserId;

            return (
              <div key={msg._id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
                {!isOwn && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5 overflow-hidden">
                    {msg.userAvatar ? (
                      <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      msg.userName.charAt(0).toUpperCase()
                    )}
                  </div>
                )}

                <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-[10px] text-white/30 mb-0.5 px-0.5">{msg.userName}</p>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm break-words ${
                      isOwn
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white rounded-br-md'
                        : 'bg-white/[0.06] text-white/85 rounded-bl-md'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <p className={`text-[9px] text-white/15 mt-0.5 px-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="px-3 py-2 border-t border-white/[0.06] bg-[#111827]">
          <div className="flex flex-wrap gap-0.5">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { setInput((p) => p + emoji); inputRef.current?.focus(); }}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 sm:px-4 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-2 rounded-lg transition-colors ${
              showEmojis ? 'bg-cyan-500/15 text-cyan-400' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
            }`}
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…"
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/15 transition-all"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white disabled:opacity-25 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-violet-600 transition-all shadow-lg shadow-cyan-500/15"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
