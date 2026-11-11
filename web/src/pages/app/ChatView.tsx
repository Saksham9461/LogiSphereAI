// ==============================================================================
// LogiSphere AI — Real-time Team Communications (Internal Chat)
// Direct messaging, user roster, unread counters, and WebSocket stream
// Backed by /api/chat and /ws/chat
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Search,
  CheckCheck,
  Check,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { chatService } from '../../services/chatService';
import type { ChatUser, ChatMessage, ConversationSummary } from '../../types';

export const ChatView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  // Scoped container ref to prevent whole-page scrolling
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ONLY the chat messages container (never scrolls the browser window)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load
  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      try {
        const [uList, cList] = await Promise.all([
          chatService.getUsers(),
          chatService.getConversations(),
        ]);
        // Filter out self from user roster
        const currentId = user?.id || user?.userId;
        const otherUsers = uList.filter((u) => u.id !== currentId);
        setUsers(otherUsers);
        setConversations(cList);

        if (otherUsers.length > 0 && !selectedUser) {
          handleSelectUser(otherUsers[0], cList);
        }
      } catch (err) {
        console.error('Failed to init chat', err);
      } finally {
        setLoading(false);
      }
    };

    initChat();

    // Connect WebSocket
    const cleanupWs = chatService.connectChatWs({
      onConnected: () => setWsConnected(true),
      onDisconnected: () => setWsConnected(false),
      onMessageReceived: (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },
    });

    return () => {
      if (cleanupWs) cleanupWs();
    };
  }, []);

  const handleSelectUser = async (targetUser: ChatUser, convList = conversations) => {
    setSelectedUser(targetUser);
    try {
      // Find existing conversation or get/create from backend to ensure conversationId is resolved
      const existingConv = convList.find((c) => c.participant?.id === targetUser.id);
      let convId = existingConv?.id;

      if (!convId) {
        convId = await chatService.getOrCreateConversation(targetUser.id);
      }

      if (convId) {
        setActiveConversationId(convId);
        const msgList = await chatService.getMessages(convId);
        setMessages(msgList);
        await chatService.markRead(convId);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUser || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const currentId = user?.id || user?.userId || '';
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId || 'temp',
      senderId: currentId,
      receiverId: selectedUser.id,
      message: text,
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Calls backend POST /api/chat/conversations/:conversationId/messages
      const sentMsg = await chatService.sendMessage(
        activeConversationId || selectedUser.id,
        text,
        selectedUser.id
      );

      if (sentMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? sentMsg : m))
        );
        if (!activeConversationId && sentMsg.conversationId) {
          setActiveConversationId(sentMsg.conversationId);
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Fleet Team Communications
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.25rem 0 0 0' }}>
            Instant coordination between dispatchers, drivers, and operations managers.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: wsConnected ? '#D1FAE5' : '#F3F4F6',
            color: wsConnected ? '#065F46' : '#6B7280',
            padding: '0.35rem 0.75rem',
            borderRadius: 999,
            fontSize: '0.78rem',
            fontWeight: 700,
            border: `1px solid ${wsConnected ? '#A7F3D0' : '#E5E7EB'}`,
          }}
        >
          <Radio size={14} className={wsConnected ? 'animate-pulse' : ''} />
          <span>{wsConnected ? 'Real-Time Connected' : 'Connecting Chat...'}</span>
        </div>
      </div>

      {/* Main Split Chat Layout */}
      <div
        className="app-card"
        style={{
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          height: 'calc(100vh - 220px)',
          minHeight: 520,
          maxHeight: 'calc(100vh - 180px)',
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left Column: Team Directory */}
        <div
          style={{
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            background: '#F9FAFB',
            minWidth: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Search Directory */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #E5E7EB',
              background: '#FFFFFF',
              height: 60,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search staff & drivers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 0.65rem 0 2rem',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* User List */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelected = u.id === selectedUser?.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      background: isSelected ? '#FEF3C7' : 'transparent',
                      borderBottom: '1px solid #F3F4F6',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: isSelected ? '#F59E0B' : '#E5E7EB',
                          color: isSelected ? '#FFFFFF' : '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: u.isOnline ? '#10B981' : '#9CA3AF',
                          border: '2px solid #FFFFFF',
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'capitalize' }}>
                        {u.role?.replace(/ROLE_/g, '').replace(/_/g, ' ').toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6B7280', fontSize: '0.8rem' }}>
                {loading ? 'Loading team directory...' : 'No colleagues found.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat History & Input */}
        {selectedUser ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              minWidth: 0,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Conversation Header */}
            <div
              style={{
                height: 60,
                boxSizing: 'border-box',
                padding: '0 1.25rem',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: selectedUser.isOnline ? '#059669' : '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: selectedUser.isOnline ? '#10B981' : '#9CA3AF' }} />
                    <span>{selectedUser.isOnline ? 'Online now' : 'Offline'}</span>
                    <span>&bull;</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {selectedUser.role?.replace(/ROLE_/g, '').replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Thread Scroll Area */}
            <div
              ref={messagesContainerRef}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {messages.length > 0 ? (
                messages.map((m) => {
                  const currentId = user?.id || user?.userId;
                  const isMine = m.senderId === currentId;

                  return (
                    <div
                      key={m.id || m.tempId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '0.65rem 0.95rem',
                          borderRadius: 12,
                          background: isMine ? '#F59E0B' : '#F3F4F6',
                          color: isMine ? '#FFFFFF' : '#111827',
                          fontSize: '0.875rem',
                          lineHeight: 1.4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}
                      >
                        {m.message}
                      </div>

                      <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          m.status === 'READ' ? <CheckCheck size={12} color="#10B981" /> : <Check size={12} />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No messages yet. Send a direct dispatch message to begin conversation.
                </div>
              )}
            </div>

            {/* Input Bar — Pinned with flexShrink: 0 and boxSizing */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#FFFFFF',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              <input
                type="text"
                placeholder={`Message ${selectedUser.name}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                style={{
                  flex: 1,
                  height: 42,
                  padding: '0 0.85rem',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#FFFFFF',
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="btn-primary"
                style={{
                  padding: '0 1.25rem',
                  height: 42,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  flexShrink: 0,
                }}
              >
                <Send size={15} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
            Select a team member to open chat.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
