import React, { useState } from 'react';
import '../styles/itinerary-builder.css';

/**
 * ItineraryBuilder Component

 * @component
 * @example
 * <ItineraryBuilder 
 *   tripId={123}
 *   onSave={(itinerary) => console.log(itinerary)}
 * />
 */
const ItineraryBuilder = ({ tripId = null, initialItinerary = [], onSave = null }) => {
  // State management
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activities, setActivities] = useState(initialItinerary || []);
  const [draggedActivity, setDraggedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    time: '09:00',
    category: 'sightseeing',
    date: ''
  });

  /**
   * Generate array of dates between start and end date
   */
  const getDateRange = () => {
    if (!startDate || !endDate) return [];
    
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  /**
   * Handle date input change
   */
  const handleDateChange = (e, type) => {
    const date = e.target.value;
    if (type === 'start') {
      setStartDate(date);
      // Reset end date if it's before start date
      if (endDate && new Date(date) > new Date(endDate)) {
        setEndDate('');
      }
    } else {
      setEndDate(date);
    }
  };

  /**
   * Add new activity to itinerary
   */
  const handleAddActivity = (e) => {
    e.preventDefault();
    
    if (!newActivity.title || !newActivity.date) {
      alert('Please fill in title and date');
      return;
    }

    const activity = {
      id: Date.now(),
      ...newActivity,
      tripId: tripId
    };

    setActivities([...activities, activity]);
    setNewActivity({
      title: '',
      description: '',
      time: '09:00',
      category: 'sightseeing',
      date: ''
    });
    setShowAddForm(false);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e, activity) => {
    setDraggedActivity(activity);
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Handle drop on date
   */
  const handleDropOnDate = (e, date) => {
    e.preventDefault();
    
    if (!draggedActivity) return;

    // Update activity date
    const updatedActivities = activities.map(activity =>
      activity.id === draggedActivity.id
        ? { ...activity, date: date.toISOString().split('T')[0] }
        : activity
    );

    setActivities(updatedActivities);
    setDraggedActivity(null);
  };

  /**
   * Delete activity
   */
  const handleDeleteActivity = (activityId) => {
    setActivities(activities.filter(activity => activity.id !== activityId));
  };

  /**
   * Edit activity
   */
  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setNewActivity(activity);
    setShowAddForm(true);
  };

  /**
   * Save edited activity
   */
  const handleSaveEdit = (e) => {
    e.preventDefault();
    
    const updatedActivities = activities.map(activity =>
      activity.id === editingActivity.id
        ? { ...activity, ...newActivity }
        : activity
    );

    setActivities(updatedActivities);
    setEditingActivity(null);
    setNewActivity({
      title: '',
      description: '',
      time: '09:00',
      category: 'sightseeing',
      date: ''
    });
    setShowAddForm(false);
  };

  /**
   * Get activities for a specific date
   */
  const getActivitiesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return activities.filter(activity => activity.date === dateStr);
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Save itinerary
   */
  const handleSaveItinerary = () => {
    if (onSave) {
      onSave({
        tripId,
        startDate,
        endDate,
        activities
      });
    }
  };

  const dateRange = getDateRange();

  return (
    <div className="itinerary-builder">
      <div className="itinerary-header">
        <h2>Trip Itinerary</h2>
        <p>Plan your activities day by day</p>
      </div>

      {/* Date Range Selection */}
      <div className="date-range-selector">
        <div className="date-input-group">
          <label htmlFor="start-date">Start Date:</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e, 'start')}
            className="date-input"
          />
        </div>

        <div className="date-input-group">
          <label htmlFor="end-date">End Date:</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(e, 'end')}
            className="date-input"
            min={startDate}
          />
        </div>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="add-activity-form">
          <h3>{editingActivity ? 'Edit Activity' : 'Add Activity'}</h3>
          <form onSubmit={editingActivity ? handleSaveEdit : handleAddActivity}>
            <div className="form-group">
              <label htmlFor="activity-title">Activity Title *</label>
              <input
                id="activity-title"
                type="text"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                placeholder="e.g., Visit Eiffel Tower"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="activity-date">Date *</label>
              <input
                id="activity-date"
                type="date"
                value={newActivity.date}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                min={startDate}
                max={endDate}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="activity-time">Time</label>
                <input
                  id="activity-time"
                  type="time"
                  value={newActivity.time}
                  onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="activity-category">Category</label>
                <select
                  id="activity-category"
                  value={newActivity.category}
                  onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
                >
                  <option value="sightseeing">Sightseeing</option>
                  <option value="dining">Dining</option>
                  <option value="shopping">Shopping</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transportation">Transportation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="activity-description">Description</label>
              <textarea
                id="activity-description"
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Add notes about this activity..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingActivity ? 'Update Activity' : 'Add Activity'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingActivity(null);
                  setNewActivity({
                    title: '',
                    description: '',
                    time: '09:00',
                    category: 'sightseeing',
                    date: ''
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Activity Button */}
      {!showAddForm && (
        <button
          className="btn btn-primary btn-add-activity"
          onClick={() => setShowAddForm(true)}
        >
          + Add Activity
        </button>
      )}

      {/* Calendar/Timeline View */}
      {dateRange.length > 0 ? (
        <div className="itinerary-calendar">
          {dateRange.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayActivities = getActivitiesForDate(date);

            return (
              <div
                key={dateStr}
                className="itinerary-day"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnDate(e, date)}
              >
                <div className="day-header">
                  <h3>{formatDate(date)}</h3>
                  <span className="activity-count">
                    {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                  </span>
                </div>

                <div className="activities-list">
                  {dayActivities.length > 0 ? (
                    dayActivities
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((activity) => (
                        <div
                          key={activity.id}
                          className={`activity-card category-${activity.category}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, activity)}
                        >
                          <div className="activity-time">{activity.time}</div>
                          <div className="activity-details">
                            <h4>{activity.title}</h4>
                            {activity.description && (
                              <p className="activity-description">{activity.description}</p>
                            )}
                            <span className="activity-category">{activity.category}</span>
                          </div>
                          <div className="activity-actions">
                            <button
                              className="btn-icon btn-edit"
                              onClick={() => handleEditActivity(activity)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteActivity(activity.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="empty-day">No activities planned for this day</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>Select start and end dates to begin planning your itinerary</p>
        </div>
      )}

      {/* Save Button */}
      {activities.length > 0 && (
        <div className="itinerary-actions">
          <button className="btn btn-primary btn-lg" onClick={handleSaveItinerary}>
            Save Itinerary
          </button>
        </div>
      )}
    </div>
  );
};

export default ItineraryBuilder;
