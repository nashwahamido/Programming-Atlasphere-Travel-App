import React, { useState } from "react";
import "../styles/voting-system.css";
import colosseum from "../../../assets/images/colosseum.jpg";
import trevi from "../../../assets/images/trevi.jpg";
import basilica from "../../../assets/images/basilica.jpg";
import pantheon from "../../../assets/images/pantheon.jpg";
import villa from "../../../assets/images/villa.jpg";
import messageIcon from "../../../assets/images/message-icon.svg";
import calendarIcon from "../../../assets/images/calendar-icon.svg";
import sendIcon from "../../../assets/images/send-icon-bold.svg";
import thumbsUpIcon from "../../../assets/images/thumbs-up-icon.svg";
import discoverIcon from "../../../assets/images/discover-icon.svg";
import thumbsDownIcon from "../../../assets/images/thumbs-down-icon.svg";
import leftArrowIconBold from "../../../assets/images/left-arrow-icon-bold.svg";
import rightArrowIconBold from "../../../assets/images/right-arrow-icon-bold.svg";
import maybeIcon from "../../../assets/images/maybe-icon.svg";

const MAX_VISIBILITY = 2;

const activities = [
  {
    id: 1,
    name: "Basilica",
    tags: ["Culture", "Nature"],
    description:
      "St. Peter's Basilica is a church of the Italian High Renaissance located in Vatican City.",
    image: basilica,
  },
  {
    id: 2,
    name: "Colosseum",
    tags: ["Culture"],
    description:
      "Explore one of Rome's most iconic landmarks and discover ancient Roman history.",
    image: colosseum,
  },
  {
    id: 3,
    name: "Trevi",
    tags: ["Relax"],
    description:
      "Visit the famous fountain and enjoy one of Rome's most loved city spots.",
    image: trevi,
  },
  {
    id: 4,
    name: "Pantheon",
    tags: ["Culture"],
    description:
      "Visit a masterpiece of ancient Roman architecture in the heart of the city.",
    image: pantheon,
  },
  {
    id: 5,
    name: "Villa",
    tags: ["Nature"],
    description:
      "Relax in one of Rome's most beautiful green spaces and scenic gardens.",
    image: villa,
  },
];

const icons = {
  message: messageIcon,
  discover: discoverIcon,
  calendar: calendarIcon,
  send: sendIcon,
  yes: thumbsUpIcon,
  maybe: maybeIcon,
  no: thumbsDownIcon,
  left: leftArrowIconBold,
  right: rightArrowIconBold,
};

function ActivityCard({ activity, vote, onVote }) {
  return (
    <div className="vote-card">
      <img src={activity.image} alt={activity.name} className="vote-card-image" />
      <div className="vote-card-overlay" />

      <button type="button" className="share-btn" aria-label={`Share ${activity.name}`}>
        <img src={icons.send} alt="" className="share-icon" />
      </button>

      <div className="vote-card-content">
        <div className="tag-list">
          {activity.tags.map((tag) => (
            <span key={tag} className="activity-tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="activity-copy">
          <h2>{activity.name}</h2>
          <p>{activity.description}</p>
        </div>

        <div className="vote-buttons">
          <button
            type="button"
            className={`vote-button ${vote === "yes" ? "selected" : ""}`}
            onClick={() => onVote("yes")}
            aria-label={`Vote yes for ${activity.name}`}
          >
            <img src={icons.yes} alt="" className="vote-icon" />
          </button>

          <button
            type="button"
            className={`vote-button maybe-button ${vote === "maybe" ? "selected" : ""}`}
            onClick={() => onVote("maybe")}
            aria-label={`Vote maybe for ${activity.name}`}
          >
            <img src={icons.maybe} alt="" className="vote-icon maybe-icon" />
          </button>

          <button
            type="button"
            className={`vote-button ${vote === "no" ? "selected" : ""}`}
            onClick={() => onVote("no")}
            aria-label={`Vote no for ${activity.name}`}
          >
            <img src={icons.no} alt="" className="vote-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Carousel({ children, active, setActive }) {
  const count = React.Children.count(children);

  return (
    <div className="carousel-3d">
      <button
        type="button"
        className="nav-btn left"
        onClick={() => setActive((i) => (i - 1 + count) % count)}
        aria-label="Previous"
      >
        <img src={icons.left} alt="" className="nav-icon nav-icon-white" />
      </button>

      {React.Children.map(children, (child, i) => (
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
      ))}

      <button
        type="button"
        className="nav-btn right"
        onClick={() => setActive((i) => (i + 1) % count)}
        aria-label="Next"
      >
        <img src={icons.right} alt="" className="nav-icon nav-icon-white" />
      </button>
    </div>
  );
}

export default function VotingSystem() {
  const [active, setActive] = useState(2);
  const [votes, setVotes] = useState({});

  const handleVote = (activityId, choice) => {
    setVotes((prev) => ({
      ...prev,
      [activityId]: choice,
    }));
  };

  const handleSubmit = () => {
    const payload = activities.map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      vote: votes[activity.id] || "",
    }));

    console.log("Submitted votes:", payload);
  };

  return (
    <main className="voting-page">
      <section className="voting-section">
        <header className="voting-header">
          <h1>Recommended</h1>
          <p>Vote for things to do in Rome</p>
        </header>

        <div className="voting-toggle">
          <button type="button" className="toggle-btn" aria-label="Messages">
            <img src={icons.message} alt="" className="toggle-icon" />
          </button>

          <button type="button" className="toggle-btn active" aria-label="Discover">
            <img src={icons.discover} alt="" className="toggle-icon" />
          </button>

          <button type="button" className="toggle-btn" aria-label="Calendar">
            <img src={icons.calendar} alt="" className="toggle-icon" />
          </button>
        </div>

        <Carousel active={active} setActive={setActive}>
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              vote={votes[activity.id]}
              onVote={(choice) => handleVote(activity.id, choice)}
            />
          ))}
        </Carousel>

        <div className="submit-container">
          <button
            type="button"
            className="submit-votes-button"
            onClick={handleSubmit}
          >
            Submit votes
          </button>
        </div>
      </section>
    </main>
  );
}
