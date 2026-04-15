import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../styles/voting-system.css";

var MAX_VISIBILITY = 2;

var icons = {
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
          {(activity.tags || []).map(function (tag) {
            return (
              <span key={tag} className="activity-tag">
                {tag}
              </span>
            );
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
            onClick={function () {
              onVote("yes");
            }}
            aria-label={"Vote yes for " + activity.name}
          >
            <img src={icons.yes} alt="" className="vote-icon" />
          </button>

          <button
            type="button"
            className={"vote-button maybe-button" + (vote === "maybe" ? " selected" : "")}
            onClick={function () {
              onVote("maybe");
            }}
            aria-label={"Vote maybe for " + activity.name}
          >
            <img src={icons.maybe} alt="" className="vote-icon maybe-icon" />
          </button>

          <button
            type="button"
            className={"vote-button" + (vote === "no" ? " selected" : "")}
            onClick={function () {
              onVote("no");
            }}
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

  if (count === 0) {
    return null;
  }

  return (
    <div className="carousel-3d">
      <button
        type="button"
        className="nav-btn left"
        onClick={function () {
          setActive(function (i) {
            return (i - 1 + count) % count;
          });
        }}
        aria-label="Previous"
      >
        <img src={icons.left} alt="" className="nav-icon nav-icon-white" />
      </button>

    {React.Children.map(children, function (child, i) {
      var count = React.Children.count(children);
      var rawOffset = active - i;

      // Lets carousel loop
      if (rawOffset > count / 2) rawOffset -= count;
      if (rawOffset < -count / 2) rawOffset += count;

      return (
        <div
          className="card-container"
          style={{
            "--active": i === active ? 1 : 0,
            "--offset": rawOffset / 3,
            "--direction": Math.sign(rawOffset),
            "--abs-offset": Math.abs(rawOffset) / 3,
            pointerEvents: i === active ? "auto" : "none",
            opacity: Math.abs(rawOffset) > MAX_VISIBILITY ? "0" : "1",
            display: Math.abs(rawOffset) > MAX_VISIBILITY ? "none" : "block",
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
        onClick={function () {
          setActive(function (i) {
            return (i + 1) % count;
          });
        }}
        aria-label="Next"
      >
        <img src={icons.right} alt="" className="nav-icon nav-icon-white" />
      </button>
    </div>
  );
}


export default function VotingSystem(props) {
  var destination = props.destination || "Rome";
  var groupId = props.groupId || "";
  var userId = props.userId || "";

  var activeState = useState(0);
  var active = activeState[0];
  var setActive = activeState[1];

  var activitiesState = useState([]);
  var activities = activitiesState[0];
  var setActivities = activitiesState[1];

  var votedIdsState = useState({});
  var votedIds = votedIdsState[0];
  var setVotedIds = votedIdsState[1];

  var loadingState = useState(true);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState("");
  var error = errorState[0];
  var setError = errorState[1];

  var votingState = useState(false);
  var isVoting = votingState[0];
  var setIsVoting = votingState[1];

  var feedbackState = useState(null);
  var feedback = feedbackState[0];
  var setFeedback = feedbackState[1];

  var preferences = useMemo(function () {
    try {
      var gp = localStorage.getItem("activityPreferences-" + groupId);
      if (gp) return JSON.parse(gp);
      return JSON.parse(localStorage.getItem("activityPreferences")) || [];
    } catch (e) {
      return [];
    }
  }, [groupId]);

  useEffect(function () {
    setLoading(true);
    fetch(
      "/api/recommendations?city=" +
        encodeURIComponent(destination) +
        "&activities=" +
        encodeURIComponent(preferences.join(","))
    )
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(function (data) {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(function (err) {
        console.error(err);
        setError("Could not load recommendations right now.");
        setLoading(false);
      });
  }, [preferences, destination]);

  useEffect(function () {
    if (!groupId) return;
    fetch("/api/votes?groupId=" + groupId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var map = {};
        data.forEach(function (v) { map[v.activityId] = v.vote; });
        setVotedIds(map);
      })
      .catch(function () {});
  }, [groupId]);

  var visibleActivities = useMemo(function () {
    return activities.filter(function (a) { return !votedIds[a.id]; });
  }, [activities, votedIds]);

  var safeActive = visibleActivities.length === 0 ? 0 : Math.min(active, visibleActivities.length - 1);

  var handleVote = function (activity, choice) {
    if (isVoting || !groupId) return;
    setIsVoting(true);

    var voteType = choice === "yes" ? "upvote" : choice === "maybe" ? "bookmark" : "downvote";
    var label = voteType === "upvote" ? "Upvoted" : voteType === "bookmark" ? "Bookmarked" : "Dismissed";

    fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: groupId,
        activityId: activity.id,
        activityName: activity.name,
        activityImage: activity.image,
        activityDesc: activity.description || "",
        activityTags: activity.tags || [],
        vote: voteType
      })
    })
      .then(function () {
        setVotedIds(function (prev) {
          var next = {};
          for (var k in prev) next[k] = prev[k];
          next[activity.id] = voteType;
          return next;
        });

        setFeedback({ text: label + ": " + activity.name, type: voteType });
        setTimeout(function () { setFeedback(null); }, 1500);

        setActive(function (prev) {
          var remaining = visibleActivities.length - 1;
          if (remaining <= 0) return 0;
          return Math.min(prev, remaining - 1);
        });

        setIsVoting(false);
      })
      .catch(function () { setIsVoting(false); });
  };

  if (loading) {
    return (
      <main className="voting-page">
        <section className="voting-section">
          <header className="voting-header">
            <h1>Recommended</h1>
            <p>Loading things to do in {destination}...</p>
          </header>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="voting-page">
        <section className="voting-section">
          <header className="voting-header">
            <h1>Recommended</h1>
            <p>{error}</p>
          </header>
        </section>
      </main>
    );
  }

  if (visibleActivities.length === 0 && activities.length > 0) {
    return (
      <main className="voting-page">
        <section className="voting-section">
          <header className="voting-header">
            <h1>All Done!</h1>
            <p>You've voted on all recommendations. Check the Itinerary tab to see your upvoted and saved activities.</p>
          </header>
        </section>
      </main>
    );
  }

  if (activities.length === 0) {
    return (
      <main className="voting-page">
        <section className="voting-section">
          <header className="voting-header">
            <h1>Recommended</h1>
            <p>No recommendations found for {destination} yet.</p>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="voting-page">
      <section className="voting-section">
        <header className="voting-header">
          <h1>Recommended</h1>
          <p>Vote on things to do in {destination}. Upvote, bookmark, or dismiss.</p>
        </header>

        {feedback && (
          <div className={"vote-feedback vote-feedback--" + feedback.type}>{feedback.text}</div>
        )}

        <Carousel active={safeActive} setActive={setActive}>
          {visibleActivities.map(function (activity) {
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                vote={null}
                onVote={function (choice) {
                  handleVote(activity, choice);
                }}
              />
            );
          })}
        </Carousel>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary, #888)' }}>
          {visibleActivities.length} of {activities.length} remaining
        </div>
      </section>
    </main>
  );
}