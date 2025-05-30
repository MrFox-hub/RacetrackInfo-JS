import { useEffect, useState } from "react";
import socket from "../../utils/socket";
import "../../styles/lap-tracker.css";
import timeFormatter from "../../utils/timeFormatter";
import numFormatter from "../../utils/numFormatter";
import { useNavigate } from "react-router-dom";

const LapObserverPage = () => {
  const navigate = useNavigate();
  const [raceStatus, setRaceStatus] = useState("MAINTENANCE");
  const [raceTimer, setRaceTimer] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [viewMode, setViewMode] = useState("landscape");
  const [pulseActive, setPulseActive] = useState(false);
  const [disabledButtons, setDisabledButtons] = useState({});
  const [flagType, setFlagType] = useState("MAINTENANCE");

  useEffect(() => {
    const updateRace = (data) => {
      setRaceStatus(data.raceStatus);
      setRaceTimer(timeFormatter(data.remainingMillis));
      setLeaderboard(data.leaderboard);
      setFlagType(data.currentFlag || "MAINTENANCE");

      if (data.remainingMillis <= 10000 && data.remainingMillis > 0) {
        setPulseActive(true);
      } else {
        setPulseActive(false);
      }
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) {
        console.error("Failed to fetch race data:", res.error);
      }
    });

    socket.on("race:update", updateRace);
    return () => socket.off("race:update", updateRace);
  }, []);

  useEffect(() => {
    const detectOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setViewMode(isLandscape ? "landscape" : "portrait");
    };

    // Trigger on load
    detectOrientation();

    // Listen for orientation changes
    window.addEventListener("resize", detectOrientation);

    return () => {
      window.removeEventListener("resize", detectOrientation);
    };
  }, []);

  const handleLap = (carNumber) => {
    if (raceStatus !== "IN_SESSION" || disabledButtons[carNumber]) return;

    // Disable button with 3-second countdown
    let secondsLeft = 3;
    setDisabledButtons((prev) => ({ ...prev, [carNumber]: secondsLeft }));

    const countdown = setInterval(() => {
      secondsLeft -= 1;

      setDisabledButtons((prev) => {
        const updated = { ...prev, [carNumber]: secondsLeft };
        if (secondsLeft <= 0) {
          delete updated[carNumber];
          clearInterval(countdown);
        }
        return updated;
      });
    }, 1000);

    socket.emit("recordLap", carNumber);
  };

  const getFlagEmoji = (flag) => {
    switch (flag?.toUpperCase()) {
      case "SAFE":
        return "🟢";
      case "HAZARD":
        return "🟡";
      case "DANGER":
        return "🔴";
      case "FINISH":
        return "🏁";
    }
  };

  return (
    <div className={`lap-line-tracker ${viewMode}-mode`}>
      <button className="back-button" onClick={() => navigate("/")}>
        Back
      </button>

      {raceTimer && (
        <div className={`timer-display ${pulseActive ? "timer-pulsing" : ""}`}>
          {raceTimer}
          <div className="flag-indicator">{getFlagEmoji(flagType)}</div>
        </div>
      )}

      <div className="lap-buttons">
        {[...leaderboard]
          .sort((a, b) => a.carNumber - b.carNumber)
          .map((driver) => {
            const isDisabled = disabledButtons[driver.carNumber] !== undefined;
            const countdown = disabledButtons[driver.carNumber];

            return (
              <button
                className="lap-action-button"
                key={driver.carNumber}
                onClick={() => handleLap(driver.carNumber)}
                disabled={isDisabled || raceStatus !== "IN_SESSION"}
              >
                {isDisabled ? countdown + "s" : numFormatter(driver.carNumber)}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default LapObserverPage;
