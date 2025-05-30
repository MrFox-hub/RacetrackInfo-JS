import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "../../styles/mainpage.css";

const MainPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="mainpage-wrapper roboto-mono-regular">
      <h1 className="mainpage-title roboto-mono-bold">🏁 Beachside Racetrack</h1>

      {/* Guest Section */}
      <section className="mainpage-section">
        <h2 className="mainpage-section-title roboto-mono-medium">🎉 Guest Access</h2>
        <div className="mainpage-buttons">
          <button onClick={() => navigate("/leaderboard")} className="mainpage-button">
            📊 Leaderboard
          </button>
          <button onClick={() => navigate("/next-race")} className="mainpage-button">
            🏎️ Next Race
          </button>
        </div>
      </section>

      <div className="mainpage-divider" />

      {/* Employee Section */}
      <section className="mainpage-section">
        <h2 className="mainpage-section-title roboto-mono-medium">👔 Employee Access</h2>
        <div className="mainpage-buttons">
          {user ? (
            <>
              {/* Safety Role */}
              {user.role === "safety" && (
                <button onClick={() => navigate("/race-control")} className="mainpage-button">
                  Race Control
                </button>
              )}

              {/* Observer Role */}
              {user.role === "observer" && (
                <button onClick={() => navigate("/lap-line-tracker")} className="mainpage-button">
                  Lap Tracker
                </button>
              )}

              {/* Receptionist Role */}
              {user.role === "receptionist" && (
                <button onClick={() => navigate("/front-desk")} className="mainpage-button">
                  Front Desk
                </button>
              )}

              {/* Developer Role */}
              {user.role === "developer" && (
                <>
                  <button onClick={() => navigate("/race-control")} className="mainpage-button">
                    Race Control
                  </button>
                  <button onClick={() => navigate("/lap-line-tracker")} className="mainpage-button">
                    Lap Tracker
                  </button>
                  <button onClick={() => navigate("/front-desk")} className="mainpage-button">
                    Front Desk
                  </button>
                </>
              )}

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="mainpage-button"
              >
                🔒 Logout
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/login")} className="mainpage-button">
              👔 Employee Login
            </button>
          )}
        </div>
      </section>

      <div className="mainpage-divider" />

      {/* Track Displays Section */}
      <section className="mainpage-section">
        <h2 className="mainpage-section-title roboto-mono-medium">🚧 Track Displays</h2>
        <div className="mainpage-buttons">
          <button onClick={() => navigate("/race-countdown")} className="mainpage-button">
            ⏲️ Race Countdown
          </button>
          <button onClick={() => navigate("/race-flags")} className="mainpage-button">
            🏳️ Race Flags
          </button>
        </div>
      </section>
    </div>
  );
};

export default MainPage;
