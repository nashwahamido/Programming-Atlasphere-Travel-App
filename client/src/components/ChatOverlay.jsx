import React, { useEffect, useRef, useState } from 'react';
import ChatBox from './ChatBox';
import '../styles/chat-overlay.css';

var ChatOverlay = function(props) {
  var openState = useState(false);
  var isOpen = openState[0];
  var setIsOpen = openState[1];

  var unreadState = useState(0);
  var unreadCount = unreadState[0];
  var setUnreadCount = unreadState[1];

  var socketRef = useRef(null);
  var connectedRef = useRef(false);
  var isOpenRef = useRef(false);

  var groupId = props.groupId || '';
  var userId = props.userId || '';
  var userName = props.userName || 'You';
  var userAvatar = props.userAvatar || '';
  var notificationsMuted = !!props.notificationsMuted;

  useEffect(function() {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      // Clear this group's unread in localStorage when opening
      try { localStorage.removeItem('atlas_unread_' + groupId); } catch (e) {}
      window.dispatchEvent(new CustomEvent('atlas-unread-update'));
    }
  }, [isOpen]);

  useEffect(function() {
    if (notificationsMuted) {
      setUnreadCount(0);
    }
  }, [notificationsMuted]);

  // ── Sync unread count from localStorage (shared with navbar badges) ──
  useEffect(function() {
    if (!groupId) return;

    function getLocalUnread() {
      try {
        return parseInt(localStorage.getItem('atlas_unread_' + groupId) || '0', 10);
      } catch (e) { return 0; }
    }

    // Read initial value on load
    if (!isOpenRef.current) setUnreadCount(getLocalUnread());

    function onUpdate() {
      if (!isOpenRef.current) setUnreadCount(getLocalUnread());
    }

    window.addEventListener('atlas-unread-update', onUpdate);
    window.addEventListener('storage', onUpdate);
    return function() {
      window.removeEventListener('atlas-unread-update', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [groupId]);

  useEffect(function() {
    if (!groupId || !userId) return;
    if (connectedRef.current) return;

    function initSocket() {
      if (!window.io) return;

      connectedRef.current = true;
      var socket = window.io();
      socketRef.current = socket;

      socket.emit('join-group', {
        groupId: groupId,
        userId: userId,
        userName: userName,
        userAvatar: userAvatar
      });

      socket.on('new-message', function(msg) {
        var isOwnMessage = String(msg.userId) === String(userId);

        // Here it means count only ‘new messages received from others’
        // Furthermore: if the overlay is open, or if the user is currently in the main chat tab, do not count them
        if (!isOwnMessage && !isOpenRef.current && !notificationsMuted) {
          setUnreadCount(function(prev) {
            return prev + 1;
          });
        }
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
          if (window.io) {
            clearInterval(check);
            initSocket();
          }
        }, 100);
      }
    }

return function() {
  // Don't disconnect — component stays mounted
};
  
  }, [groupId, userId, userName, userAvatar, notificationsMuted]);

  function handleToggle() {
    if (!isOpen) {
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  }

  function handleClose() {
    setUnreadCount(0);
    setIsOpen(false);
  }

  return React.createElement(
    'div',
    { className: 'co' },

    isOpen && React.createElement(
      'div',
      { className: 'co__panel' },
      React.createElement(
        'div',
        { className: 'co__panel-header' },
        React.createElement(
          'div',
          { className: 'co__panel-title' },
          React.createElement('span', null, props.groupName || 'Chat'),
          React.createElement(
            'span',
            { className: 'co__panel-status' },
            React.createElement('span', { className: 'co__status-dot' }),
            ' Online'
          )
        ),
        React.createElement(
          'button',
          {
            className: 'co__close',
            onClick: handleClose
          },
          '✕'
        )
      ),
      React.createElement(ChatBox, {
        groupId: props.groupId,
        userId: props.userId,
        userName: props.userName,
        userAvatar: props.userAvatar || '',
        groupName: props.groupName,
        groupColor: props.groupColor,
        groupPhoto: props.groupPhoto || '',
        compact: true
      })
    ),

    React.createElement(
      'button',
      {
        className: 'co__toggle' + (isOpen ? ' co__toggle--open' : ''),
        onClick: handleToggle
      },
        React.createElement('img', {
        src: '/icons/Message Icon Bold.svg',
        alt: 'Chat',
        style: { width: 24, height: 24, filter: 'brightness(0) invert(1)' }
      }),
      unreadCount > 0 &&
        React.createElement(
          'span',
          { className: 'co__toggle-badge' },
          '+' + unreadCount
        )
    )
  );
};

export default ChatOverlay;