import React, { useEffect, useMemo, useState } from "react";
import "../styles/activities.css";

//max number of cards visible on either side of the active card in the carousel
var MAX_VISIBILITY = 2;

//all the available activity options
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
};

//main activity card showing the image, name and a select/deselect button
function ActivityCard(props) {
  var activity = props.activity;
  var selected = props.selected;
  var onSelect = props.onSelect;

  return (
    <div className="vote-card selection-card">
      <img src={activity.image} alt={activity.name} className="vote-card-image" />
      <div className="vote-card-overlay selection-overlay" />

      <div className="vote-card-content selection-card-content">
        <div className="selection-bottom">
          <h2 className="selection-title">{activity.name}</h2>

          {/*toggles the selected state on button click */}
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

//3D carousel
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
      {/* Left navigation button disabled for the first card so users go throguh list fully from start (different from recommended) */}
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
              //only the active card is interactive
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

      {/*right navigation button is disabled on the last card */}
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

  var errorState = useState("");
  var error = errorState[0];
  var setError = errorState[1];

  // restores any saved activity preferences from localStorage
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

  // all activities are visible
  var visibleActivities = activityOptions;

  var safeActive =
    visibleActivities.length === 0
      ? 0
      : Math.min(active, visibleActivities.length - 1);

  //derives a plain array of selected activity names for saving
  var selectedActivities = activityOptions
    .filter(function (activity) {
      return !!selected[activity.id];
    })
    .map(function (activity) {
      return activity.name;
    });

  //toggles an ativity's selected state
  function handleSelect(activityId) {
    setSelected(function (prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[activityId] = !prev[activityId];
      return next;
    });
  }

  // save selections and navigate to the next step
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

    // no group, go straight to the groups page
    window.location.href = "/groups";
  }

  // skip activity selection and go directly to the group page
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

