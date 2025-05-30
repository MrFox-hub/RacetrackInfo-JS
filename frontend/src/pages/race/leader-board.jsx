import React, { useEffect, useState } from "react";
import "../../styles/leader-board.css";
import socket from "../../utils/socket";
import timeFormatter from "../../utils/timeFormatter";
import numFormatter from "../../utils/numFormatter";
import { useNavigate } from "react-router-dom";
import FlagDisplay from "../../components/FlagDisplay";

const LeaderBoard = () => {
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [raceStatus, setRaceStatus] = useState("MAINTENANCE");
  const [currentFlag, setCurrentFlag] = useState("DANGER");
  const [remainingMillis, setRemainingMillis] = useState(0);
  const [raceName, setRaceName] = useState("");
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    const handleRaceUpdate = (data) => {
      setLeaderboardData(data.leaderboard);
      setCurrentFlag(data.currentFlag);
      setRaceStatus(data.raceStatus);
      setRemainingMillis(data.remainingMillis);
      setRaceName(data.raceName);
      setIsFinal(data.remainingMillis <= 10000 && data.remainingMillis > 0);
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) {
        console.error("Failed to fetch race data:", res.error);
      }
    });

    socket.on("race:update", handleRaceUpdate);

    return () => {
      socket.off("race:update", handleRaceUpdate);
    };
  }, []);

  return (
    <div className="leaderboard-container roboto-mono-regular">
      <button className="back-button roboto-mono-medium" onClick={() => navigate("/")}>
        ← Back
      </button>
      <div className="race-title-container">
        <h1 className="race-name roboto-mono-bold">{raceName}</h1>
        <div className={`race-timer ${isFinal ? "flash-red" : ""} roboto-mono-bold`}>
          {timeFormatter(remainingMillis)}
        </div>
      </div>
      <div className="race-meta roboto-mono-regular">
        <div>
          <strong className="roboto-mono-medium">Status:</strong> {raceStatus}
        </div>
        <div>
          <strong className="roboto-mono-medium">Flag:</strong> <FlagDisplay flag={currentFlag} />
        </div>
      </div>
      {/* Wrap table for horizontal scrolling on small screens */}
      <div className="table-scroll-wrapper">
        <table className="leaderboard">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Car #</th>
              <th>Driver</th>
              <th>Fastest Lap</th>
              <th>Current Lap</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((driver, index) => (
              <tr key={driver.carNumber}>
                <td>{index + 1}</td>
                <td>{numFormatter(driver.carNumber)}</td>
                <td>{driver.driverName}</td>
                <td>{driver.fastestLap !== null ? driver.fastestLap.toFixed(2) + "s" : "—"}</td>
                <td>{driver.currentLap !== null ? driver.currentLap : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>{" "}
      {/* End table-scroll-wrapper */}
    </div>
  );
};

export default LeaderBoard;
