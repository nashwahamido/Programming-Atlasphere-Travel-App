import React, { useEffect, useRef, useState } from 'react';
import ChatBox from './ChatBox';
import '../styles/chat-overlay.css';

var PREFIX = 'atlas_unread_';

function getUnread(groupId) {
  try {
    return parseInt(localStorage.getItem(PREFIX + groupId) || '0', 10);
  } catch (e) { return 0; }
}

var ChatOverlay = function(props) {
  var openState = useState(false);
  var isOpen = openState[0];
  var setIsOpen = openState[1];

  var unreadState = useState(0);
  var unreadCount = unreadState[0];
  var setUnreadCount = unreadState[1];

  var isOpenRef = useRef(false);

  var groupId = props.groupId || '';
  var notificationsMuted = !!props.notificationsMuted;

  // Keep isOpenRef in sync
  useEffect(function() {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      try { localStorage.removeItem(PREFIX + groupId); } catch (e) {}
      window.dispatchEvent(new CustomEvent('atlas-unread-update'));
    }
  }, [isOpen]);

  // Read unread count from localStorage (single source of truth).
  // chat-notification.js writes to localStorage on new messages.
  // We just read from it whenever it changes.
  useEffect(function() {
    if (!groupId) return;

    // Initial read
    if (!isOpenRef.current && !notificationsMuted) {
      setUnreadCount(getUnread(groupId));
    }

    function onUpdate() {
      if (isOpenRef.current) {
        // Overlay is open — user is reading, keep at 0 and clear storage
        setUnreadCount(0);
        try { localStorage.removeItem(PREFIX + groupId); } catch (e) {}
      } else if (!notificationsMuted) {
        setUnreadCount(getUnread(groupId));
      }
    }

    // Listen for updates from chat-notification.js and cross-tab storage events
    window.addEventListener('atlas-unread-update', onUpdate);
    window.addEventListener('storage', onUpdate);
    // Also listen for the overlay-specific message event (from ChatBox socket)
    window.addEventListener('atlas-overlay-message', onUpdate);

    return function() {
      window.removeEventListener('atlas-unread-update', onUpdate);
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('atlas-overlay-message', onUpdate);
    };
  }, [groupId, notificationsMuted]);

  function handleToggle() {
    var opening = !isOpen;
    setUnreadCount(0);
    setIsOpen(opening);
    if (opening) {
      try { localStorage.removeItem(PREFIX + groupId); } catch (e) {}
      window.dispatchEvent(new CustomEvent('atlas-unread-update'));
    }
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
          { className: 'co__close', onClick: handleClose },
          '\u2715'
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