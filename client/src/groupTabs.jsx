/**
 * groupTabs.jsx — Mount File (Entry Point)
 * ─────────────────────────────────────────────────────────────────────────────
 * BRIDGE between the EJS page and React.*/

import React from 'react';
import { createRoot } from 'react-dom/client';

// ── Components ─────────────────────────────────────────────────────────────
import Tabs from './components/groupTabs';
import ItineraryBuilder from './components/ItineraryBuilder';
import RecommendedContent from './components/RecommendedContent';
import VotingSystem from './components/VotingSystem';

// ── Styles ─────────────────────────────────────────────────────────────────
import './styles/tabs.css';
import './styles/itinerary-builder.css';


// ═════════════════════════════════════════════════════════════════════════════
// MOUNT — All tabs into #group-tabs-root
// ═════════════════════════════════════════════════════════════════════════════

const tabsMount = document.getElementById('group-tabs-root');

if (tabsMount) {
  // Read data attributes set by EJS in groupPage.ejs
  const groupId   = tabsMount.dataset.groupId;
  const userId    = tabsMount.dataset.userId;
  const groupName = tabsMount.dataset.groupName;

  // ── Tab: Chat ────────────────────────────────────────────────────────────
  // TODO: Replace with ChatBox component when Anna builds it
  // import ChatBox from './components/ChatBox';
  const ChatTab = () => (
    <div className="tab-placeholder">
      <div className="placeholder-icon">💬</div>
      <h3>Group Chat</h3>
      <p>Chat for <strong>{groupName || 'this group'}</strong> will appear here.</p>
      <p className="placeholder-note">
        To build: create <code>client/src/components/ChatBox.jsx</code>,
        then import and use it here.
      </p>
    </div>
  );

  // ── Tab: Recommended (uses VotingSystem) ─────────────────────────────────
  const RecommendedTab = () => (
    <div>
      <RecommendedContent groupId={groupId} />
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color, #e0e0e0)', paddingTop: '24px' }}>
        <VotingSystem
          onSubmit={(votes) => {
            // Week 2: POST to backend
            console.log('Votes submitted:', votes);
          }}
        />
      </div>
    </div>
  );

  // ── Tab: Itinerary ───────────────────────────────────────────────────────
  const ItineraryTab = () => (
    <ItineraryBuilder
      tripId={groupId}
      onSave={(itinerary) => {
        // Week 2: POST to backend
        // fetch(`/api/groups/${groupId}/itinerary`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(itinerary)
        // });
        console.log('Itinerary saved:', itinerary);
      }}
    />
  );

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    {
      id:      'chat',
      label:   'Chat',
      icon:    '💬',
      content: <ChatTab />,
    },
    {
      id:      'recommended',
      label:   'Recommended',
      icon:    '⭐',
      content: <RecommendedTab />,
    },
    {
      id:      'itinerary',
      label:   'Itinerary',
      icon:    '📅',
      content: <ItineraryTab />,
    },
  ];

  // ── Mount ─────────────────────────────────────────────────────────────────
  createRoot(tabsMount).render(
    <React.StrictMode>
      <Tabs tabs={tabs} defaultTab="chat" />
    </React.StrictMode>
  );
}


