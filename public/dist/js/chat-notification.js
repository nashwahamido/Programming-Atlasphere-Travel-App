(function () {
  var navEl = document.getElementById('atlasphere-navbar');
  if (!navEl) return;
  var currentUserId = String(navEl.dataset.userId || '');
  var PREFIX = 'atlas_unread_';

  // Track which group the user is currently viewing (starts from URL, updated by sidebar)
  var pathMatch = window.location.pathname.match(/\/groups\/([^\/]+)$/);
  var activeGroupId = pathMatch ? String(pathMatch[1]) : null;

  // When user switches group in sidebar (no page reload), update activeGroupId
  window.addEventListener('atlas-active-group-changed', function(e) {
    if (e.detail && e.detail.groupId) {
      activeGroupId = String(e.detail.groupId);
      clearGroup(activeGroupId);
    }
  });

  /* ── Read total unread from localStorage ── */
  function getTotalUnread() {
    var total = 0;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.startsWith(PREFIX)) {
          total += parseInt(localStorage.getItem(k) || '0', 10);
        }
      });
    } catch (e) { }
    return total;
  }

  /* ── Refresh all badges (navbar chat icon + Groups nav link) ── */
  function updateBadge() {
    var count = getTotalUnread();
    var label = count > 99 ? '99+' : String(count);

    var chatBadge = document.getElementById('navbar-chat-badge');
    if (chatBadge) {
      chatBadge.textContent = label;
      chatBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    var groupsBadge = document.getElementById('navbar-groups-badge');
    if (groupsBadge) {
      groupsBadge.textContent = label;
      groupsBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    // Notify React TabSwitcher via custom event
    window.dispatchEvent(new CustomEvent('atlas-unread-update', { detail: { count: count } }));
  }

  /* ── Clear unread for a specific group ── */
  function clearGroup(groupId) {
    try { localStorage.removeItem(PREFIX + groupId); } catch (e) { }
    updateBadge();
  }

  /* ── On page load: if viewing a group page, clear its unread count ── */
  if (activeGroupId) {
    clearGroup(activeGroupId);
  }
  updateBadge();

  /* ── Clear group count when user opens chat tab or chat overlay ── */
  document.addEventListener('click', function (e) {
    var chatTarget =
      e.target.closest('[data-tab="chat"]') ||
      e.target.closest('.co__toggle');
    if (chatTarget && activeGroupId) {
      clearGroup(activeGroupId);
    }
  });

  /* ── Storage events: sync badge across browser tabs ── */
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.startsWith(PREFIX)) updateBadge();
  });

  if (!currentUserId) return;

  /* ── Connect socket and subscribe to all user's groups ── */
  function initSocket(groups) {
    if (!window.io || !groups.length) return;
    var socket = window.io();

    socket.emit('join-notifications', {
      groupIds: groups.map(function (g) { return g.id; })
    });

    socket.on('new-message', function (msg) {
      if (!msg.groupId) return;
      // Ignore own messages
      if (String(msg.userId) === currentUserId) return;
      // Ignore if user is already viewing this group (URL or sidebar-selected)
      if (activeGroupId && String(activeGroupId) === String(msg.groupId)) return;

      try {
        var prev = parseInt(localStorage.getItem(PREFIX + msg.groupId) || '0', 10);
        localStorage.setItem(PREFIX + msg.groupId, prev + 1);
      } catch (e) { }
      updateBadge();
    });
  }

  /* ── Fetch user's group list, then start socket ── */
  fetch('/groups/api/my-groups')
    .then(function (r) { return r.json(); })
    .then(function (groups) {
      if (!groups || !groups.length) return;
      if (window.io) {
        initSocket(groups);
      } else {
        var existing = document.querySelector('script[src="/socket.io/socket.io.js"]');
        if (!existing) {
          var s = document.createElement('script');
          s.src = '/socket.io/socket.io.js';
          s.onload = function () { initSocket(groups); };
          document.head.appendChild(s);
        } else {
          var check = setInterval(function () {
            if (window.io) { clearInterval(check); initSocket(groups); }
          }, 100);
        }
      }
    })
    .catch(function (e) {
      console.warn('Chat notification init failed:', e);
    });
})();