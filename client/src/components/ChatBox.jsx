/**
 * ChatBox.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Group chat component. Mounted inside the Chat tab via groupTabs.jsx.
 *
 * Props:
 *   groupId   {string|number} — the group/trip id
 *   userId    {string|number} — current user id
 *   userName  {string}        — current user display name
 *
 * TODO (Week 2): Connect to Socket.io for real-time messaging
 */

import React, { useState, useRef, useEffect } from 'react';
import '../styles/chatbox.css';

const ChatBox = ({ groupId = '1', userId = '1', userName = 'You' }) => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Alice', text: 'Hey everyone! Excited about the trip! 🎉', time: '10:30', self: false },
    { id: 2, user: 'Bob', text: 'Me too! Did we decide on the Colosseum visit?', time: '10:32', self: false },
    { id: 3, user: userName, text: 'Yes! I booked tickets for Thursday at 10am', time: '10:35', self: true },
    { id: 4, user: 'Alice', text: 'Perfect! Should we do lunch after?', time: '10:36', self: false },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const now = new Date();
    const timeStr =
      now.getHours().toString().padStart(2, '0') + ':' +
      now.getMinutes().toString().padStart(2, '0');

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: userName,
        text: input.trim(),
        time: timeStr,
        self: true,
      },
    ]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatbox">
      <div className="chatbox__messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chatbox__bubble-wrap ${msg.self ? 'chatbox__bubble-wrap--self' : ''}`}
          >
            {!msg.self && <span className="chatbox__sender">{msg.user}</span>}
            <div className={`chatbox__bubble ${msg.self ? 'chatbox__bubble--self' : ''}`}>
              {msg.text}
            </div>
            <span className="chatbox__time">{msg.time}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chatbox__input-area">
        <input
          className="chatbox__input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />
        <button className="chatbox__send" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;