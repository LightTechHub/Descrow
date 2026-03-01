// src/components/ChatSystem.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Loader } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatSystem = ({ escrowId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  // FIX: track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // FIX: useCallback so the interval closure always calls the latest version
  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat/${escrowId}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && mountedRef.current) {
        const incoming = res.data.data.messages || [];
        // FIX: deduplicate by _id so rapid polls don't show duplicates
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const newOnly = incoming.filter(m => !existingIds.has(m._id));
          if (newOnly.length === 0) return prev; // no change, avoid re-render
          return incoming; // replace with full server list (authoritative)
        });
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [escrowId, API_URL]);

  // FIX: escrowId in dependency array, and fetchMessages is stable via useCallback
  // When escrowId changes, old interval is cleared and a new one starts
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchMessages]); // fetchMessages already depends on escrowId

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/chat/${escrowId}/send`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Optimistically append, fetchMessages will deduplicate
        setMessages(prev => [...prev, res.data.data]);
        setNewMessage('');
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('attachments', file);

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/chat/${escrowId}/send`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('File upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to send file');
    } finally {
      setSending(false);
      // FIX: safe null check before clearing input — component may have unmounted
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender?._id === currentUser?._id;
            return (
              // FIX: use msg._id as key, not array index
              <div key={msg._id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}>
                  {!isCurrentUser && (
                    <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender?.name}</p>
                  )}

                  {msg.attachments?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {msg.attachments.map((file, idx) => (
                        <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm underline break-all">
                          📎 {file.filename || file.originalname || 'Attachment'}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message || ''}</p>
                  )}

                  <p className="text-xs opacity-60 mt-1">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage}
        className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50">
            <Paperclip className="w-5 h-5" />
          </button>

          <input type="text" value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          <button type="submit" disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2">
            {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatSystem;
