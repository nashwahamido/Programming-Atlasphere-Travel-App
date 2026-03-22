import React, { useState } from "react";
import '../styles/voting-system.css';

const defaultActivities = [
  {
    id: 1,
    name: "Culture",
    image: "culture.jpg",
    alt: "culture activity",
  },
  {
    id: 2,
    name: "Sports",
    image: "sports.jpg",
    alt: "sport activity",
  },
  {
    id: 3,
    name: "Entertainment",
    image: "entertain.jpg",
    alt: "entertainment activity",
  },
  {
    id: 4,
    name: "Relax",
    image: "relax.jpg",
    alt: "relax activity",
  },
];

export default function VotingSystem({
  activities = defaultActivities,
  onSubmit,
}) {
  const [votes, setVotes] = useState({});

  const handleVote = (activityId, choice) => {
    setVotes((prev) => ({
      ...prev,
      [activityId]: choice,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = activities.map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      vote: votes[activity.id] || "",
    }));

    if (onSubmit) {
      onSubmit(payload);
    } else {
      console.log("Submitted votes:", payload);
    }
  };

  return (
    <main>
      <section className="votingSection">
        <h1>Vote on group activities</h1>
        <p>
          Let your group know which activities you want to do on the trip.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="activityContainer">
            {activities.map((activity) => (
              <div className="activityCard" key={activity.id}>
                <figure>
                  <img
                    src={activity.image}
                    alt={activity.alt}
                    className="activityImg"
                  />
                </figure>

                <div className="activityName">
                  <h4>{activity.name}</h4>
                </div>

                <div className="IconContainer">
                  <button
                    type="button"
                    className={`iconBtn ${
                      votes[activity.id] === "yes" ? "selected" : ""
                    }`}
                    onClick={() => handleVote(activity.id, "yes")}
                  >
                    Yes
                  </button>

                  <button
                    type="button"
                    className={`iconBtn ${
                      votes[activity.id] === "maybe" ? "selected" : ""
                    }`}
                    onClick={() => handleVote(activity.id, "maybe")}
                  >
                    Maybe
                  </button>

                  <button
                    type="button"
                    className={`iconBtn ${
                      votes[activity.id] === "no" ? "selected" : ""
                    }`}
                    onClick={() => handleVote(activity.id, "no")}
                  >
                    No
                  </button>
                </div>

                {votes[activity.id] && (
                  <p className="voteStatus">
                    Your vote: <strong>{votes[activity.id]}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="submitContainer">
            <button type="submit">Submit Votes</button>
          </div>
        </form>
      </section>
    </main>
  );
}