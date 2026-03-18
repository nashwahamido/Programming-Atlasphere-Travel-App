import React, { useState } from 'react';
import Tabs from './Tabs';
import ChatContent from './ChatContent';
import RecommendedContent from './RecommendedContent';
import ItineraryContent from './ItineraryContent';
import '../styles/group-profile.css';

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

  const tabs = [
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      badge: 3,
      content: <ChatContent groupId={groupId} />,
    },
    {
      id: 'recommended',
      label: 'Recommended',
      icon: '⭐',
      content: <RecommendedContent groupId={groupId} />,
    },
    {
      id: 'itinerary',
      label: 'Itinerary',
      icon: '📅',
      content: <ItineraryContent groupId={groupId} tripId={groupId} />,
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
          <span>👥 {group.members} members</span>
          <span>📅 {group.startDate} → {group.endDate}</span>
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
