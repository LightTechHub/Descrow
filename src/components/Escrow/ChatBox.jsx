// src/components/Escrow/ChatBox.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Send, Loader, RefreshCw, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function ChatBox({ escrowId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  // FIX: Resolve sender name correctly.
  // The bug: msg.sender was a plain ObjectId string (not populated), so msg.sender?.name = undefined.
  // Fix: chat route may return sender as ObjectId or as populated {_id, name, email}.
  // We use currentUser._id to detect own messages, and fall back gracefully for partner name.
  const getSenderName = (msg) => {
    // If sender was populated (object with name field)
    if (msg.sender && typeof msg.sender === 'object' && msg.sender.name) {
      return msg.sender.name;
    }
    // If sender is just an ID string, check if it matches currentUser
    const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
    const myId = currentUser?._id?.toString() || currentUser?.id?.toString();
    if (senderId === myId) return 'You';
    // Partner name from senderRole as fallback
    return msg.senderRole
      ? msg.senderRole.charAt(0).toUpperCase() + msg.senderRole.slice(1)
      : 'Partner';
  };

  const isMyMessage = (msg) => {
    const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
    const myId = currentUser?._id?.toString() || currentUser?.id?.toString();
    return senderId === myId;
  };

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API_URL}/chat/${escrowId}/messages`,
        getAuthHeaders()
      );
      // Support both response shapes: { messages: [...] } or { data: { messages: [...] } }
      const msgs = res.data?.messages || res.data?.data?.messages || res.data?.chat || [];
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      if (!silent) {
        const msg = err.response?.data?.message || 'Failed to load messages';
        setError(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [escrowId]);

  // Initial load + poll every 5 seconds for new messages
  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const optimisticId = `opt_${Date.now()}`;

    // Optimistic UI: show message immediately
    const optimistic = {
      _id: optimisticId,
      sender: { _id: currentUser?._id || currentUser?.id, name: 'You' },
      senderRole: currentUser?.role || '',
      message: trimmed,
      timestamp: new Date().toISOString(),
      pending: true
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');

    try {
      await axios.post(
        `${API_URL}/chat/${escrowId}/send`,
        { message: trimmed },
        { headers: { ...getAuthHeaders().headers, 'Content-Type': 'application/json' } }
      );
      // Refresh to get server-confirmed message (removes optimistic)
      await fetchMessages(true);
    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m._id !== optimisticId));
      const msg = err.response?.data?.message || 'Failed to send message';
      toast.error(msg);
      setText(trimmed); // restore text
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => fetchMessages()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-[480px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation with your partner</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dayMsgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 bg-white dark:bg-gray-900 px-2">{date}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {dayMsgs.map((msg) => {
                const mine = isMyMessage(msg);
                return (
                  <div key={msg._id} className={`flex mb-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender name — only show for partner messages */}
                      {!mine && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                          {getSenderName(msg)}
                        </span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                        ${mine
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                        }
                        ${msg.pending ? 'opacity-60' : ''}
                      `}>
                        {/* FIX: render msg.message, not msg.text or msg.content */}
                        {msg.message || msg.text || msg.content || ''}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                        {msg.pending && ' · Sending...'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending
              ? <Loader className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 px-1">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
