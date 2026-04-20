(function () {
  var navEl = document.getElementById('atlasphere-navbar');
  if (!navEl) return;
  var currentUserId = String(navEl.dataset.userId || '');
  var PREFIX = 'atlas_unread_';

  console.log('[NOTIF] init — userId:', currentUserId);

  var pathMatch = window.location.pathname.match(/\/groups\/([^\/]+)$/);
  var activeGroupId = pathMatch ? String(pathMatch[1]) : null;
  console.log('[NOTIF] activeGroupId from URL:', activeGroupId);

  window.addEventListener('atlas-active-group-changed', function(e) {
    if (e.detail && e.detail.groupId) {
      activeGroupId = String(e.detail.groupId);
      console.log('[NOTIF] activeGroupId changed to:', activeGroupId);
      clearGroup(activeGroupId);
    }
  });

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

    window.dispatchEvent(new CustomEvent('atlas-unread-update', { detail: { count: count } }));
  }

  function clearGroup(groupId) {
    try { localStorage.removeItem(PREFIX + groupId); } catch (e) { }
    updateBadge();
  }

  if (activeGroupId) {
    clearGroup(activeGroupId);
  }
  updateBadge();

  document.addEventListener('click', function (e) {
    var chatTarget =
      e.target.closest('[data-tab="chat"]') ||
      e.target.closest('.co__toggle');
    if (chatTarget && activeGroupId) {
      clearGroup(activeGroupId);
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key && e.key.startsWith(PREFIX)) updateBadge();
  });

  if (!currentUserId) {
    console.warn('[NOTIF] No userId — skipping socket init');
    return;
  }

  function initSocket(groups) {
    if (!window.io || !groups.length) {
      console.warn('[NOTIF] initSocket skipped — io:', !!window.io, 'groups:', groups.length);
      return;
    }
    var socket = window.io();
    console.log('[NOTIF] Socket connected, joining', groups.length, 'groups');

    var groupIds = groups.map(function (g) { return String(g.id); });
    socket.emit('join-notifications', { groupIds: groupIds });

    socket.on('new-message', function (msg) {
      if (!msg.groupId) return;
      var msgGroupId = String(msg.groupId);
      var msgUserId = String(msg.userId);

      if (msgUserId === currentUserId) return;
      if (activeGroupId && activeGroupId === msgGroupId) return;

      console.log('[NOTIF] Unread +1 for group', msgGroupId);

      try {
        var prev = parseInt(localStorage.getItem(PREFIX + msgGroupId) || '0', 10);
        localStorage.setItem(PREFIX + msgGroupId, prev + 1);
      } catch (e) { }
      updateBadge();
    });

    socket.on('connect_error', function(err) {
      console.error('[NOTIF] Socket error:', err.message);
    });
  }

  fetch('/groups/api/my-groups')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (groups) {
      console.log('[NOTIF] my-groups returned', groups.length, 'groups');
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
      console.error('[NOTIF] Init failed:', e);
    });
})();