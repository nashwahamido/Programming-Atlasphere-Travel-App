import React, { useState, useRef, useEffect } from 'react';
import '../styles/chatbox.css';

var ChatBox = function(props) {
  var groupId = props.groupId || '1';
  var userId = props.userId || '1';
  var userName = props.userName || 'You';
  var userAvatar = props.userAvatar || '';
  var groupName = props.groupName || 'Rome';
  var groupColor = props.groupColor || '#3B5F8A';
  var groupPhoto = props.groupPhoto || '';
  var compact = props.compact || false;

  var msgState = useState([]);
  var messages = msgState[0];
  var setMessages = msgState[1];
  var inputState = useState('');
  var input = inputState[0];
  var setInput = inputState[1];
  var socketRef = useRef(null);
  var bottomRef = useRef(null);
  var connectedRef = useRef(false);

  useEffect(function() {
    if (connectedRef.current) return;

    function initSocket() {
      if (!window.io) return;
      connectedRef.current = true;
      var socket = window.io();
      socketRef.current = socket;

      socket.emit('join-group', { groupId: groupId, userId: userId, userName: userName, userAvatar: userAvatar });

      socket.on('chat-history', function(history) {
        setMessages(history);
      });

      socket.on('new-message', function(msg) {
        setMessages(function(prev) { return prev.concat([msg]); });
      });

      socket.on('user-joined', function(data) {
        setMessages(function(prev) {
          return prev.concat([{ id: 'sys-' + Date.now(), system: true, text: data.userName + ' joined the chat' }]);
        });
      });
    }

    if (window.io) {
      initSocket();
    } else {
      var existing = document.querySelector('script[src="/socket.io/socket.io.js"]');
      if (!existing) {
        var script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = initSocket;
        document.head.appendChild(script);
      } else {
        var check = setInterval(function() {
          if (window.io) { clearInterval(check); initSocket(); }
        }, 100);
      }
    }

 return function() {
  // Don't disconnect on unmount since we keep component mounted
};

  }, [groupId]);

  useEffect(function() {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  var sendMessage = function() {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('send-message', {
      groupId: groupId,
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      text: input.trim()
    });
    setInput('');
  };

  var handleKey = function(e) {
    if (e.key === 'Enter') sendMessage();
  };

  function renderAvatar(avatarUrl, fallbackColor, extraClass) {
    var cls = 'cb__avatar' + (extraClass ? ' ' + extraClass : '');
    if (avatarUrl) {
      return React.createElement('div', { className: cls },
        React.createElement('img', { src: avatarUrl, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' } })
      );
    }
    return React.createElement('div', { className: cls, style: { backgroundColor: fallbackColor } });
  }

  var headerIcon;
  if (groupPhoto) {
    headerIcon = React.createElement('div', { className: 'cb__header-icon', style: { overflow: 'hidden' } },
      React.createElement('img', { src: groupPhoto, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' } })
    );
  } else {
    headerIcon = React.createElement('div', { className: 'cb__header-icon', style: { backgroundColor: groupColor } });
  }

  return React.createElement('div', { className: compact ? 'cb cb--compact' : 'cb' },
    !compact && React.createElement('div', { className: 'cb__header' },
      headerIcon,
      React.createElement('div', { className: 'cb__header-info' },
        React.createElement('div', { className: 'cb__header-name' }, groupName),
        React.createElement('div', { className: 'cb__header-status' },
          React.createElement('span', { className: 'cb__status-dot' }),
          'Online'
        )
      )
    ),
    React.createElement('div', { className: 'cb__messages' },
      messages.map(function(m) {
        if (m.system) {
          return React.createElement('div', { key: m.id, className: 'cb__system' }, m.text);
        }
        var isSelf = String(m.userId) === String(userId);
        var avatarUrl = isSelf ? userAvatar : (m.userAvatar || '');

        // Detect shared activity format: [[SHARE:imageUrl|name|description]]
        var shareMatch = m.text && m.text.match(/^\[\[SHARE:([^|]*)\|([^|]+)\|([\s\S]*)\]\]$/);
        var bubbleContent;
        if (shareMatch) {
          var shareImg = shareMatch[1];
          var shareName = shareMatch[2];
          var shareDesc = shareMatch[3];
          bubbleContent = React.createElement('div', {
            className: 'cb__share-card',
            onClick: function() {
              // Switch to discover tab if callable handler exists
              if (typeof window.atlasphereSwitchTab === 'function') {
                window.atlasphereSwitchTab('discover');
              }
            },
            title: 'Click to view in recommendations'
          },
            shareImg ? React.createElement('img', { src: shareImg, alt: shareName, className: 'cb__share-card-img' }) : null,
            React.createElement('div', { className: 'cb__share-card-body' },
              React.createElement('div', { className: 'cb__share-card-label' }, '📍 Shared a place'),
              React.createElement('div', { className: 'cb__share-card-title' }, shareName),
              shareDesc ? React.createElement('div', { className: 'cb__share-card-desc' }, shareDesc) : null
            )
          );
        } else {
          bubbleContent = m.text;
        }

        return React.createElement('div', { key: m.id, className: 'cb__row' + (isSelf ? ' cb__row--self' : '') },
          !isSelf && renderAvatar(avatarUrl, '#E8933A', ''),
          React.createElement('div', { className: 'cb__bubble-group' + (isSelf ? ' cb__bubble-group--self' : '') },
            React.createElement('span', { className: 'cb__sender' + (isSelf ? ' cb__sender--self' : '') }, isSelf ? userName : (m.userName || m.user)),
            React.createElement('div', {
              className: 'cb__bubble' + (isSelf ? ' cb__bubble--self' : '') + (shareMatch ? ' cb__bubble--share' : '')
            }, bubbleContent)
          ),
          isSelf && renderAvatar(userAvatar, '#3B5F8A', 'cb__avatar--self')
        );
      }),
      messages.length === 0 && React.createElement('div', { className: 'cb__empty' }, 'No messages yet. Say hello!'),
      React.createElement('div', { ref: bottomRef })
    ),
    React.createElement('div', { className: 'cb__input-area' },
      React.createElement('div', { className: 'cb__input-wrap' },
        React.createElement('input', {
          className: 'cb__input',
          type: 'text',
          value: input,
          onChange: function(e) { setInput(e.target.value); },
          onKeyDown: handleKey,
          placeholder: 'Type a message'
        }),
        React.createElement('button', { className: 'cb__send-btn', onClick: sendMessage },
          React.createElement('img', { src: '/icons/Send Icon Bold.svg', alt: 'Send', style: { width: 20, height: 20 } })
        )
      )
    )
  );
};

export default ChatBox;