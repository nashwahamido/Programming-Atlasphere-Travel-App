
import React, { useState } from 'react';
import Tabs from './groupTabs';
import RecommendedContent from './RecommendedContent';
import ItineraryBuilder from './ItineraryBuilder';
import VotingSystem from './VotingSystem';

const GroupProfile = ({ groupId = 1 }) => {
  const [group] = useState({
    id: groupId,
    name: 'Paris Adventure 2024',
    description: 'Exploring the City of Light with friends',
    members: 5,
    startDate: '2024-03-15',
    endDate: '2024-03-20',
  });

  const [activeTab, setActiveTab] = useState('chat');

  // TODO (Week 2): Fetch real group data from backend
  // useEffect(() => {
  //   fetch(`/api/groups/${groupId}`)
  //     .then((res) => res.json())
  //     .then((data) => setGroup(data));
  // }, [groupId]);

  // Chat placeholder until ChatBox.jsx is built
  const ChatPlaceholder = () => (
    <div className="tab-placeholder">
      <div className="placeholder-icon">Icon</div>
      <h3>Group Chat</h3>
      <p>Chat for <strong>{group.name}</strong> will appear here.</p>
    </div>
  );

  const tabs = [
    {
      id: 'chat',
      label: 'Chat',
      badge: 3,
      content: <ChatPlaceholder />,
    },
    {
      id: 'recommended',
      label: 'Recommended',
      content: (
        <div>
          <RecommendedContent groupId={groupId} />
          <VotingSystem
            onSubmit={(votes) => console.log('Votes:', votes)}
          />
        </div>
      ),
    },
    {
      id: 'itinerary',
      label: 'Itinerary',
      content: (
        <ItineraryBuilder
          tripId={groupId}
          onSave={(data) => console.log('Itinerary saved:', data)}
        />
      ),
    },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="group-profile">
      {/* Group Header */}
      <div className="group-header">
        <h1>{group.name}</h1>
        <p className="group-description">{group.description}</p>
        <div className="group-meta">
          <span> {group.members} members</span>
          <span> {group.startDate} → {group.endDate}</span>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="tabs-section">
        <Tabs tabs={tabs} defaultTab="chat" onTabChange={handleTabChange} />
      </div>
    </div>
  );
};

export default GroupProfile;