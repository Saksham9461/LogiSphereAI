// ==============================================================================
// LogiSphere AI Demo — Real-time Team Communications (Chat Screen)
// 100% Identical to web/src/pages/app/ChatView.tsx in UI, theme, and layout
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Search,
  CheckCheck,
  Check,
  Radio,
} from 'lucide-react';
import { MOCK_CHAT_USERS, MOCK_CHAT_MESSAGES, DEMO_USER } from '../data/chat.mock';
import type { ChatUser, ChatMessage } from '../../../types';
import { notificationStore } from '../../../stores/notificationStore';

export const DemoChatScreen: React.FC = () => {
  const [users] = useState<ChatUser[]>(() => [...MOCK_CHAT_USERS]);
  const [selectedUser, setSelectedUser] = useState<ChatUser>(users[0]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [...MOCK_CHAT_MESSAGES]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUser || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: `conv-${selectedUser.id}`,
      senderId: DEMO_USER.id,
      receiverId: selectedUser.id,
      message: text,
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    setMessages((prev) => [...prev, newMsg]);

    // Simulate immediate sent status, then delivered
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'DELIVERED' } : m))
      );
      setSending(false);
    }, 400);

    // Realistic driver reply after 2 seconds
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversationId: `conv-${selectedUser.id}`,
        senderId: selectedUser.id,
        receiverId: DEMO_USER.id,
        message: 'Understood, copy that. Continuing route.',
        createdAt: new Date().toISOString(),
        status: 'READ',
      };
      setMessages((prev) => [...prev, replyMsg]);

      notificationStore.pushNotification({
        type: 'CHAT',
        title: 'Team Dispatch Message',
        senderName: selectedUser.name,
        message: replyMsg.message,
        routeTarget: 'chat',
      });
    }, 2200);
  };

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeMessages = messages.filter(
    (m) =>
      (m.senderId === selectedUser.id && m.receiverId === DEMO_USER.id) ||
      (m.senderId === DEMO_USER.id && m.receiverId === selectedUser.id)
  );

  return (
    <div>
      {/* Top Action Header (exact match with ChatView.tsx) */}
      <div
        className="chat-header-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
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
            background: '#D1FAE5',
            color: '#065F46',
            padding: '0.35rem 0.75rem',
            borderRadius: 999,
            fontSize: '0.78rem',
            fontWeight: 700,
            border: '1px solid #A7F3D0',
          }}
        >
          <Radio size={14} className="animate-pulse" />
          <span>Real-Time Connected</span>
        </div>
      </div>

      {/* Main Split Chat Layout (exact match with ChatView.tsx) */}
      <div
        className="app-card chat-two-col-grid"
        style={{
          padding: 0,
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
          className="chat-roster-column"
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
            className="chat-roster-search"
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
                    onClick={() => setSelectedUser(u)}
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
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: isSelected ? '#92400E' : '#111827',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: isSelected ? '#B45309' : '#6B7280',
                          textTransform: 'capitalize',
                        }}
                      >
                        {u.role?.replace(/ROLE_/g, '').replace(/_/g, ' ').toLowerCase()}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                No colleagues matching "{search}"
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Conversation */}
        {selectedUser ? (
          <div
            className="chat-conversation-column"
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
              className="chat-conv-header"
              style={{
                padding: '0 1.25rem',
                borderBottom: '1px solid #E5E7EB',
                height: 60,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: selectedUser.isOnline ? '#10B981' : '#9CA3AF',
                      border: '2px solid #FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#6B7280' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: selectedUser.isOnline ? '#10B981' : '#9CA3AF' }} />
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
              className="chat-conv-thread"
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
              {activeMessages.length > 0 ? (
                activeMessages.map((m) => {
                  const isMine = m.senderId === DEMO_USER.id;

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
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
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

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="chat-conv-form"
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
          <div className="chat-conversation-column" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '0.875rem', padding: '2rem' }}>
            Select a team member to open chat.
          </div>
        )}
      </div>
    </div>
  );
};
