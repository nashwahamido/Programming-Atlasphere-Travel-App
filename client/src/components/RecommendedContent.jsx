import React, { useState } from 'react';
import '../styles/recommended.css';

const RecommendedContent = ({ groupId = null }) => {
  const [activities, setActivities] = useState([
    {
      id: 1,
      title: 'Eiffel Tower Visit',
      description: 'Visit the iconic Eiffel Tower and enjoy breathtaking views of Paris.',
      votes: 12,
      userVoted: false,
      category: 'sightseeing',
    },
    {
      id: 2,
      title: 'Louvre Museum',
      description: 'Explore the world-famous art museum and see the Mona Lisa.',
      votes: 8,
      userVoted: true,
      category: 'sightseeing',
    },
    {
      id: 3,
      title: 'French Dinner',
      description: 'Traditional French cuisine experience at a local brasserie.',
      votes: 15,
      userVoted: false,
      category: 'dining',
    },
    {
      id: 4,
      title: 'Seine River Cruise',
      description: 'Relaxing boat cruise along the Seine River.',
      votes: 10,
      userVoted: false,
      category: 'entertainment',
    },
  ]);

  const handleVote = (activityId) => {
    setActivities(
      activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              votes: activity.userVoted ? activity.votes - 1 : activity.votes + 1,
              userVoted: !activity.userVoted,
            }
          : activity
      )
    );
  };

  return (
    <div className="recommended-content">
      <div className="activities-list">
        {activities.map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-info">
              <h4>{activity.title}</h4>
              <p>{activity.description}</p>
              <span className="category-badge">{activity.category}</span>
            </div>
            <button
              className={`vote-button ${activity.userVoted ? 'voted' : ''}`}
              onClick={() => handleVote(activity.id)}
            >
              👍 {activity.votes}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedContent;
