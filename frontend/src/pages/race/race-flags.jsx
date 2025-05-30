import React, { useEffect, useState } from "react";
import "../../styles/race-flags.css";
import socket from "../../utils/socket";

const RaceFlags = () => {
  const [flagType, setFlagType] = useState("DANGER");

  useEffect(() => {
    const handleRaceFlag = (data) => {
      setFlagType(data.currentFlag);
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) {
        console.error("Failed to fetch race data:", res.error);
      }
    });

    socket.on("race:update", handleRaceFlag);

    return () => socket.off("race:update", handleRaceFlag);
  }, []);

  return <div className={`flag ${flagType.toLowerCase()}`}></div>;
};

export default RaceFlags;
