import React, { useEffect, useMemo, useState } from "react";
import "../styles/activities.css";

var MAX_VISIBILITY = 2;

var activityOptions = [
  { id: 1, name: "Relax", image: "/images/relax.jpg" },
  { id: 2, name: "Nightlife", image: "/images/nightlife.jpg" },
  { id: 3, name: "Active", image: "/images/active.jpg" },
  { id: 4, name: "Culture", image: "/images/culture.jpg" },
  { id: 5, name: "Nature", image: "/images/nature.jpg" },
  { id: 6, name: "Food", image: "/images/food.jpg" },
  { id: 7, name: "Shopping", image: "/images/shopping.jpg" },
  { id: 8, name: "Entertainment", image: "/images/entertainment.jpg" },
  { id: 9, name: "Family", image: "/images/family.jpg" },
  { id: 10, name: "Fun", image: "/images/fun.jpg" },
  { id: 11, name: "Sightseeing", image: "/images/sightseeing.jpg" }
];

var icons = {
  left: "/icons/Left Arrow Icon Bold.svg",
  right: "/icons/Right Arrow Icon Bold.svg",
  close: "/icons/X Icon Bold.svg",
};

function ActivityCard(props) {
  var activity = props.activity;
  var selected = props.selected;
  var onSelect = props.onSelect;
  var onDismiss = props.onDismiss;

  return (
    <div className="vote-card selection-card">
      <img src={activity.image} alt={activity.name} className="vote-card-image" />
      <div className="vote-card-overlay selection-overlay" />

      <button
        type="button"
        className="dismiss-btn"
        onClick={onDismiss}
        aria-label={"Remove " + activity.name}
      >
        <img src={icons.close} alt="" className="dismiss-icon" />
      </button>

      <div className="vote-card-content selection-card-content">
        <div className="selection-bottom">
          <h2 className="selection-title">{activity.name}</h2>

          <button
            type="button"
            className={"select-btn" + (selected ? " selected" : "")}
            onClick={onSelect}
          >
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Carousel(props) {
  var children = props.children;
  var active = props.active;
  var setActive = props.setActive;
  var count = React.Children.count(children);

  if (count === 0) {
    return <div className="empty-state">No activities left</div>;
  }

  return (
    <div className="carousel-3d">
      <button
        type="button"
        className="nav-btn left"
        onClick={function () {
          setActive(function (i) {
            return Math.max(0, i - 1);
          });
        }}
        disabled={active === 0}
        aria-label="Previous"
      >
        <img src={icons.left} alt="" className="nav-icon-dark" />
      </button>

      {React.Children.map(children, function (child, i) {
        var rawOffset = active - i;

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
            return Math.min(count - 1, i + 1);
          });
        }}
        disabled={active === count - 1}
        aria-label="Next"
      >
        <img src={icons.right} alt="" className="nav-icon-dark" />
      </button>
    </div>
  );
}

export default function Activities(props) {
  var groupId = props.groupId || "";

  var activeState = useState(0);
  var active = activeState[0];
  var setActive = activeState[1];

  var selectedState = useState({});
  var selected = selectedState[0];
  var setSelected = selectedState[1];

  var dismissedState = useState({});
  var dismissed = dismissedState[0];
  var setDismissed = dismissedState[1];

  var errorState = useState("");
  var error = errorState[0];
  var setError = errorState[1];

  useEffect(function () {
    try {
      var saved = groupId
        ? localStorage.getItem("activityPreferences-" + groupId)
        : localStorage.getItem("activityPreferences");

      if (!saved) return;

      var parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;

      var nextSelected = {};
      activityOptions.forEach(function (activity) {
        if (parsed.indexOf(activity.name) !== -1) {
          nextSelected[activity.id] = true;
        }
      });

      setSelected(nextSelected);
    } catch (e) {
      console.error("Could not load saved activities:", e);
    }
  }, [groupId]);

  var visibleActivities = useMemo(function () {
    return activityOptions.filter(function (activity) {
      return !dismissed[activity.id];
    });
  }, [dismissed]);

  var safeActive =
    visibleActivities.length === 0
      ? 0
      : Math.min(active, visibleActivities.length - 1);

  var selectedActivities = activityOptions
    .filter(function (activity) {
      return !!selected[activity.id];
    })
    .map(function (activity) {
      return activity.name;
    });

  function handleSelect(activityId) {
    setSelected(function (prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[activityId] = !prev[activityId];
      return next;
    });
  }

  function handleDismiss(activityId) {
    setDismissed(function (prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[activityId] = true;
      return next;
    });

    setActive(function (prev) {
      if (visibleActivities.length <= 1) return 0;
      return Math.min(prev, visibleActivities.length - 2);
    });
  }

function handleContinue() {
  if (selectedActivities.length === 0) {
    setError("Please select at least one activity.");
    return;
  }

  setError("");

  localStorage.setItem(
    "activityPreferences",
    JSON.stringify(selectedActivities)
  );

  if (groupId) {
    localStorage.setItem(
      "activityPreferences-" + groupId,
      JSON.stringify(selectedActivities)
    );

    fetch("/groups/save-activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        groupId: groupId,
        activities: selectedActivities
      })
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("Failed to save activities");
        }
        return res.json();
      })
      .then(function () {
        window.location.href = "/groups/" + groupId;
      })
      .catch(function (err) {
        console.error(err);
        setError("Could not save activities. Please try again.");
      });

    return;
  }

  window.location.href = "/groups";
}

  function handleSkip() {
    if (groupId) {
      window.location.href = "/groups/" + groupId;
    } else {
      window.location.href = "/groups";
    }
  }

  return (
    <main className="activities-page">
      <section className="activities-section">
        <header className="activities-header">
          <h1>Select your favourite activities</h1>
          <p>Choose what your group would enjoy most on holiday.</p>
        </header>

        <Carousel active={safeActive} setActive={setActive}>
          {visibleActivities.map(function (activity) {
            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                selected={!!selected[activity.id]}
                onSelect={function () {
                  handleSelect(activity.id);
                }}
                onDismiss={function () {
                  handleDismiss(activity.id);
                }}
              />
            );
          })}
        </Carousel>

        <div className="submit-container">
          <button
            className="submit-votes-button"
            onClick={handleContinue}
          >
            Continue
          </button>
          <button
            className="skip-activities-btn"
            onClick={handleSkip}
          >
            Skip
          </button>
        </div>
        
        {error && (
          <p className="activities-error">{error}</p>
        )}
      </section>
    </main>
  );
}