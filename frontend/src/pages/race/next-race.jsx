import React, { useEffect, useState } from "react";
import "../../styles/next-race.css";
import socket from "../../utils/socket";
import { useNavigate } from "react-router-dom";
import numFormatter from "../../utils/numFormatter";

const NextRace = () => {
  const navigate = useNavigate();
  const [raceName, setRaceName] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const handleUpdateSessions = (data) => {
      if (data.length > 0) {
        setDrivers(JSON.parse(data[0].drivers) || []);
        setRaceName(data[0].raceName);
      }
    };

    const handleRaceUpdate = (data) => {
      setStatus(data.raceStatus);
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) {
        console.error("Failed to fetch race data:", res.error);
      }
    });

    // Initial fetch
    socket.emit("fetchSessions", (res) => {
      if (!res.success) {
        console.error("Failed to fetch sessions:", res.error);
      }
    });

    // Listen for live session updates
    socket.on("updateSessions", handleUpdateSessions);
    socket.on("race:update", handleRaceUpdate);

    return () => {
      socket.off("updateSessions", handleUpdateSessions);
      socket.off("race:update", handleRaceUpdate);
    };
  }, []);

  return (
    <div className="next-race-page roboto-mono-regular">
      <button className="back-button roboto-mono-medium" onClick={() => navigate("/")}>
        ← Back
      </button>

      <div className="next-race-header">
        <h1 className="next-race-title roboto-mono-bold">{raceName || "No upcoming races"}</h1>
        {status === "MAINTENANCE" && (
          <h1 className="next-race-message">
            Track maintenance in session. Drivers, please proceed to the paddock.
          </h1>
        )}
      </div>

      <div className="next-race-table-wrapper">
        {drivers.length > 0 && (
          <table className="next-race-table">
            <thead>
              <tr>
                <th>Car #</th>
                <th>Driver</th>
              </tr>
            </thead>
            <tbody>
              {drivers
                .sort((a, b) => a.carNumber - b.carNumber)
                .map((driver, idx) => (
                  <tr key={idx}>
                    <td>{numFormatter(driver.carNumber) || "XX"}</td>
                    <td>{driver.name || "Unnamed"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default NextRace;
