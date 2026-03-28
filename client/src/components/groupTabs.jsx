import React from 'react';
import { createRoot } from 'react-dom/client';
import TabSwitcher from './components/TabSwitcher';
import Sidebar from './components/Sidebar';
import ChatBox from './components/ChatBox';
import ItineraryBuilder from './components/ItineraryBuilder';
import './styles/tab-switcher.css';
import './styles/sidebar.css';
import './styles/chatbox.css';
import './styles/itinerary-builder.css';

var mount = document.getElementById('group-tabs-root');

if (mount) {
  var groupId = mount.dataset.groupId;
  var userId = mount.dataset.userId;
  var groupName = mount.dataset.groupName;
  var tripDays = parseInt(mount.dataset.tripDays) || 7;

  var App = function() {
    var tabState = React.useState('chat');
    var activeTab = tabState[0];
    var setActiveTab = tabState[1];

    var groupState = React.useState({ id: groupId, name: groupName || 'Rome', color: '#3B5F8A' });
    var activeGroup = groupState[0];
    var setActiveGroup = groupState[1];

    return React.createElement('div', { className: 'gp-app' },
      React.createElement(TabSwitcher, { active: activeTab, onChange: setActiveTab }),
      React.createElement('div', { className: 'gp-content' },
        activeTab === 'chat' && React.createElement(React.Fragment, null,
          React.createElement(Sidebar, {
            activeGroup: activeGroup,
            onSelect: function(g) { setActiveGroup(g); }
          }),
          React.createElement(ChatBox, {
            groupId: activeGroup.id || groupId,
            userId: userId,
            userName: 'You',
            groupName: activeGroup.name || groupName || 'Rome',
            groupColor: activeGroup.color || '#3B5F8A'
          })
        ),
        activeTab === 'itinerary' && React.createElement(ItineraryBuilder, {
          tripId: groupId,
          tripDays: tripDays
        }),
        activeTab === 'discover' && React.createElement('div', {
          style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, opacity: 0.5 }
        }, 'Recommended content coming soon')
      )
    );
  };

  createRoot(mount).render(React.createElement(App));
}
```