import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import MainPage from "./pages/common/MainPage";
import LoginForm from "./pages/auth/LoginForm";
import LeaderBoardPage from "./pages/race/leader-board";
import NextRacePage from "./pages/race/next-race";
import RaceControlPage from "./pages/staff/RaceControlPage";
import LapObserverPage from "./pages/staff/LapObserverPage";
import ReceptionistPage from "./pages/staff/ReceptionistPage";
import RaceCountdownPage from "./pages/race/race-countdown";
import RaceFlags from "./pages/race/race-flags";
import ProtectedRoute from "./context/ProtectedRoute";

const AppRouter = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/leaderboard" element={<LeaderBoardPage />} />
          <Route path="/next-race" element={<NextRacePage />} />
          <Route
            path="/race-control"
            element={
              <ProtectedRoute role="safety">
                <RaceControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lap-line-tracker"
            element={
              <ProtectedRoute role="observer">
                <LapObserverPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/front-desk"
            element={
              <ProtectedRoute role="receptionist">
                <ReceptionistPage />
              </ProtectedRoute>
            }
          />
          <Route path="/race-flags" element={<RaceFlags />} />
          <Route path="/race-countdown" element={<RaceCountdownPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default AppRouter;
