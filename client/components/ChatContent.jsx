import React, { useState } from 'react';
import '../styles/chat.css';

const ChatContent = ({ groupId = null }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'John Doe',
      avatar: '/images/avatar-john.jpg',
      message: 'Hey everyone! Excited for this trip!',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: 2,
      user: 'Jane Smith',
      avatar: '/images/avatar-jane.jpg',
      message: 'Me too! Should we book the hotel now?',
      timestamp: new Date(Date.now() - 1800000),
    },
  ]);

  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: messages.length + 1,
      user: 'You',
      avatar: '/images/default-avatar.png',
      message: newMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-content">
      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img src={msg.avatar} alt={msg.user} className="avatar" />
            <div className="message-body">
              <div className="message-header">
                <span className="username">{msg.user}</span>
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="message-text">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
        />
        <button type="submit" className="btn-send">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatContent;
