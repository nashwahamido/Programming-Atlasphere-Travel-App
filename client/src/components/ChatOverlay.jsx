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

  var isOpenRef = useRef(false);

  var groupId = props.groupId || '';
  var notificationsMuted = !!props.notificationsMuted;

  // Keep isOpenRef in sync so the event listener always reads current state
  useEffect(function() {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      try { localStorage.removeItem('atlas_unread_' + groupId); } catch (e) {}
      window.dispatchEvent(new CustomEvent('atlas-unread-update'));
    }
  }, [isOpen]);

  // Source 1: Listen to events dispatched by the main ChatBox (instant, same-tab)
  useEffect(function() {
    function onMessage() {
      if (!isOpenRef.current && !notificationsMuted) {
        setUnreadCount(function(prev) { return prev + 1; });
      }
    }
    window.addEventListener('atlas-overlay-message', onMessage);
    return function() { window.removeEventListener('atlas-overlay-message', onMessage); };
  }, [notificationsMuted]);

  // Source 2: Sync from localStorage (written by chat-notification.js via its own socket — reliable fallback)
  useEffect(function() {
    if (!groupId) return;

    function readLocalUnread() {
      try {
        return parseInt(localStorage.getItem('atlas_unread_' + groupId) || '0', 10);
      } catch (e) { return 0; }
    }

    function onStorageUpdate() {
      if (isOpenRef.current || notificationsMuted) return;
      var stored = readLocalUnread();
      if (stored > 0) {
        setUnreadCount(function(prev) { return Math.max(prev, stored); });
      }
    }

    // Check on mount
    onStorageUpdate();

    window.addEventListener('atlas-unread-update', onStorageUpdate);
    window.addEventListener('storage', onStorageUpdate);
    return function() {
      window.removeEventListener('atlas-unread-update', onStorageUpdate);
      window.removeEventListener('storage', onStorageUpdate);
    };
  }, [groupId, notificationsMuted]);

  function handleToggle() {
    if (!isOpen) setUnreadCount(0);
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