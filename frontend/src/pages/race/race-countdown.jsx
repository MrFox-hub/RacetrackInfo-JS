import React, { useEffect, useState } from "react";
import "../../styles/race-countdown.css"; // Import your CSS file here, no file currently provided
import socket from "../../utils/socket";
import timeFormatter from "../../utils/timeFormatter";

export default function RaceCountdown() {
  const [remainingTime, setRemainingTime] = useState("00:00");
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    const raceTimer = (data) => {
      setRemainingTime(timeFormatter(data.remainingMillis));
      setIsFinal(data.remainingMillis <= 10000 && data.remainingMillis > 0);
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) {
        console.error("Failed to fetch race data:", res.error);
      }
    });

    socket.on("race:update", raceTimer);

    return () => {
      socket.off("race:update", raceTimer);
    };
  }, []);

  return (
    <div className="race-countdown">
      <p id="race-timer" className={isFinal ? "flash-red" : ""}>
        {remainingTime}
      </p>
    </div>
  );
}
