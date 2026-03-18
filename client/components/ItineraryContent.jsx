import React from 'react';
import ItineraryBuilder from './ItineraryBuilder';
import '../styles/itinerary.css';

const ItineraryContent = ({ groupId = null, tripId = null }) => {
  const handleSaveItinerary = (itinerary) => {
    console.log('Saving itinerary:', itinerary);

    // TODO (Week 2): Connect to backend API
    // fetch(`/api/trips/${tripId}/itinerary`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(itinerary),
    // });
  };

  return (
    <div className="itinerary-content">
      <ItineraryBuilder tripId={tripId} onSave={handleSaveItinerary} />
    </div>
  );
};

export default ItineraryContent;
