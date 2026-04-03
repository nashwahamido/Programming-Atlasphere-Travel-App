import React, { useState } from "react";
import "../styles/voting-system.css";

var MAX_VISIBILITY = 2;

var activities = [
  {
    id: 1,
    name: "Basilica",
    tags: ["Culture", "Nature"],
    description: "St. Peter's Basilica is a church of the Italian High Renaissance located in Vatican City.",
    image: "/images/basilica.jpg",
  },
  {
    id: 2,
    name: "Colosseum",
    tags: ["Culture"],
    description: "Explore one of Rome's most iconic landmarks and discover ancient Roman history.",
    image: "/images/colosseum.jpg",
  },
  {
    id: 3,
    name: "Trevi",
    tags: ["Relax"],
    description: "Visit the famous fountain and enjoy one of Rome's most loved city spots.",
    image: "/images/trevi.jpg",
  },
  {
    id: 4,
    name: "Pantheon",
    tags: ["Culture"],
    description: "Visit a masterpiece of ancient Roman architecture in the heart of the city.",
    image: "/images/pantheon.jpg",
  },
  {
    id: 5,
    name: "Villa",
    tags: ["Nature"],
    description: "Relax in one of Rome's most beautiful green spaces and scenic gardens.",
    image: "/images/villa.jpg",
  },
];

var icons = {
  message: "/icons/Message Icon.svg",
  discover: "/icons/Discover Icon.svg",
  calendar: "/icons/Calendar Icon.svg",
  send: "/icons/Send Icon Bold.svg",
  yes: "/icons/Thumbs Up Icon.svg",
  no: "/icons/Thumbs Down Icon.svg",
  left: "/icons/Left Arrow Icon Bold.svg",
  right: "/icons/Right Arrow Icon Bold.svg",
  maybe: "/icons/maybe-icon.svg",
};

function ActivityCard({ activity, vote, onVote }) {
  return (
    <div className="vote-card">
      <img src={activity.image} alt={activity.name} className="vote-card-image" />
      <div className="vote-card-overlay" />

      <button type="button" className="share-btn" aria-label={"Share " + activity.name}>
        <img src={icons.send} alt="" className="share-icon" />
      </button>

      <div className="vote-card-content">
        <div className="tag-list">
          {activity.tags.map(function(tag) {
            return <span key={tag} className="activity-tag">{tag}</span>;
          })}
        </div>

        <div className="activity-copy">
          <h2>{activity.name}</h2>
          <p>{activity.description}</p>
        </div>

        <div className="vote-buttons">
          <button
            type="button"
            className={"vote-button" + (vote === "yes" ? " selected" : "")}
            onClick={function() { onVote("yes"); }}
            aria-label={"Vote yes for " + activity.name}
          >
            <img src={icons.yes} alt="" className="vote-icon" />
          </button>

          <button
            type="button"
            className={"vote-button maybe-button" + (vote === "maybe" ? " selected" : "")}
            onClick={function() { onVote("maybe"); }}
            aria-label={"Vote maybe for " + activity.name}
          >
            <img src={icons.maybe} alt="" className="vote-icon maybe-icon" />
          </button>

          <button
            type="button"
            className={"vote-button" + (vote === "no" ? " selected" : "")}
            onClick={function() { onVote("no"); }}
            aria-label={"Vote no for " + activity.name}
          >
            <img src={icons.no} alt="" className="vote-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Carousel({ children, active, setActive }) {
  var count = React.Children.count(children);

  return (
    <div className="carousel-3d">
      <button
        type="button"
        className="nav-btn left"
        onClick={function() { setActive(function(i) { return (i - 1 + count) % count; }); }}
        aria-label="Previous"
      >
        <img src={icons.left} alt="" className="nav-icon nav-icon-white" />
      </button>

      {React.Children.map(children, function(child, i) {
        return (
          <div
            className="card-container"
            style={{
              "--active": i === active ? 1 : 0,
              "--offset": (active - i) / 3,
              "--direction": Math.sign(active - i),
              "--abs-offset": Math.abs(active - i) / 3,
              pointerEvents: i === active ? "auto" : "none",
              opacity: Math.abs(active - i) > MAX_VISIBILITY ? "0" : "1",
              display: Math.abs(active - i) > MAX_VISIBILITY ? "none" : "block",
            }}
            key={i}
          >
            {child}
          </div>
        );
      })}

      <button
        type="button"
        className="nav-btn right"
        onClick={function() { setActive(function(i) { return (i + 1) % count; }); }}
        aria-label="Next"
      >
        <img src={icons.right} alt="" className="nav-icon nav-icon-white" />
      </button>
    </div>
  );
}

export default function VotingSystem() {
  var activeState = useState(2);
  var active = activeState[0];
  var setActive = activeState[1];
  var votesState = useState({});
  var votes = votesState[0];
  var setVotes = votesState[1];

  var handleVote = function(activityId, choice) {
    setVotes(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[activityId] = choice;
      return next;
    });
  };

  return (
    <main className="voting-page">
      <section className="voting-section">
        <header className="voting-header">
          <h1>Recommended</h1>
          <p>Vote for things to do in Rome</p>
        </header>

        <Carousel active={active} setActive={setActive}>
          {activities.map(function(activity) {
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                vote={votes[activity.id]}
                onVote={function(choice) { handleVote(activity.id, choice); }}
              />
            );
          })}
        </Carousel>
      </section>
    </main>
  );
}