import { useEffect, useState } from "react";
import socket from "../../utils/socket";
import FlagDisplay from "../../components/FlagDisplay";
import timeFormatter from "../../utils/timeFormatter";
import numFormatter from "../../utils/numFormatter";
import MainMenuButton from "../../components/MainMenuButton";
import "../../styles/race-control.css";

const RaceControlPage = () => {
  const [raceStatus, setRaceStatus] = useState("MAINTENANCE");
  const [currentFlag, setCurrentFlag] = useState("DANGER");
  const [remainingMillis, setRemainingMillis] = useState(600000);
  const [isFinal, setIsFinal] = useState(false);
  const [nextSession, setNextSession] = useState(null);

  useEffect(() => {
    const updateRace = (data) => {
      setRaceStatus(data.raceStatus);
      setCurrentFlag(data.currentFlag);
      setRemainingMillis(data.remainingMillis);
      setIsFinal(data.remainingMillis <= 10000 && data.remainingMillis > 0);
    };

    const updateSessions = (sessions) => {
      setNextSession(Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null);
    };

    socket.emit("fetchRaceData", (res) => {
      if (!res.success) console.error("Failed to fetch race data:", res.error);
    });

    socket.emit("fetchSessions", (res) => {
      if (!res.success) console.error("Failed to fetch sessions:", res.error);
    });

    socket.on("race:update", updateRace);
    socket.on("updateSessions", updateSessions);

    return () => {
      socket.off("race:update", updateRace);
      socket.off("updateSessions", updateSessions);
    };
  }, []);

  const handleChangeFlag = (flag) => {
    socket.emit("changeFlag", flag);
    if (flag === "DANGER") socket.emit("pauseRace");
    if (flag === "FINISH") socket.emit("finishRace");
  };

  const actions = {
    start: () => socket.emit("startRace"),
    resume: () => socket.emit("resumeRace"),
    reset: () => socket.emit("resetRace"),
    end: () => socket.emit("endSession"),
    green: () => socket.emit("greenLight"),
  };

  return (
    <div className="page-wrapper">
      <div className="race-control-container roboto-mono-regular">
        <MainMenuButton />
        <div className="race-control-header">
          <h1 className="roboto-mono-bold">Race Control</h1>
        </div>

        <div className="race-control-grid">
          {/* STATUS SECTION */}
          <div className="race-control-section-box">
            <p>
              <strong>Status:</strong> {raceStatus.toUpperCase()}
            </p>
            <p>
              <strong>Remaining Time:</strong>{" "}
              <span className={isFinal ? "flash-red" : ""}>{timeFormatter(remainingMillis)}</span>
            </p>
            <p>
              <strong>Current Flag:</strong> <FlagDisplay flag={currentFlag} />
            </p>
          </div>

          {/* RACE CONTROLS */}
          {(raceStatus === "MAINTENANCE" ||
            raceStatus === "STARTING" ||
            raceStatus === "STOPPED" ||
            raceStatus === "FINISHED") && (
            <div className="race-control-section-box">
              <p>
                <strong>Race Controls</strong>
              </p>
              <div className="race-input-group">
                {raceStatus === "MAINTENANCE" && (
                  <button
                    className="race-control-button"
                    onClick={actions.green}
                    disabled={!nextSession}
                  >
                    💡 Green Light
                  </button>
                )}
                {raceStatus === "STARTING" && (
                  <>
                    <button className="race-control-button" onClick={actions.start}>
                      Start 🏎️
                    </button>
                    <button className="race-control-button" onClick={actions.end}>
                      End Session 🚮
                    </button>
                  </>
                )}
                {raceStatus === "STOPPED" && (
                  <>
                    <button className="race-control-button" onClick={actions.resume}>
                      Resume 🔄
                    </button>
                    <button className="race-control-button" onClick={actions.reset}>
                      Reset 🥺
                    </button>
                  </>
                )}
                {raceStatus === "FINISHED" && (
                  <button className="race-control-button" onClick={actions.end}>
                    End Session 🚮
                  </button>
                )}
              </div>
            </div>
          )}

          {/* FLAG CONTROLS */}
          {(raceStatus === "IN_SESSION" || raceStatus === "STOPPED") && (
            <div className="race-control-section-box flag-control-wrap">
              <h2>Flag Controls</h2>
              <div className="flag-controls">
                <button className="race-control-button" onClick={() => handleChangeFlag("SAFE")}>
                  🟢 Safe
                </button>
                <button className="race-control-button" onClick={() => handleChangeFlag("HAZARD")}>
                  🟡 Hazard
                </button>
                <button className="race-control-button" onClick={() => handleChangeFlag("DANGER")}>
                  🔴 Danger
                </button>
                <button className="race-control-button" onClick={() => handleChangeFlag("FINISH")}>
                  🏁 Finish
                </button>
              </div>
              <div className="flag-info">
                <p>
                  ⚠️ <strong>DANGER</strong> flag pauses the race.
                </p>
                <p>
                  🏁 <strong>FINISH</strong> ends the race officially.
                </p>
              </div>
            </div>
          )}

          {/* UPCOMING RACE */}
          {raceStatus === "MAINTENANCE" && (
            <div className="race-control-section-box race-upcoming-sessions">
              <h2>📋 Upcoming Race</h2>
              {nextSession ? (
                <div className="race-block">
                  <span className="race-block-name">{nextSession.raceName}</span>
                  {(typeof nextSession.drivers === "string"
                    ? JSON.parse(nextSession.drivers)
                    : nextSession.drivers || []
                  ).map((d, idx) => (
                    <div key={idx} className="race-driver-pill">
                      {d.name} #{numFormatter(d.carNumber)}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No upcoming sessions.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaceControlPage;
