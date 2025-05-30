require("dotenv").config(); // Just load from `.env` directly
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const dbManager = require("./utils/dbManager.cjs");
const { initializeTables } = require("./utils/dbManager.cjs");
const { setupCountdown, startRace, stopInterval } = require("./cr-backend/race-countdown-back.cjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json()); // ⬅️ REQUIRED for req.body to work

const ACCESS_KEYS = {
  [process.env.SAFETY_KEY]: "safety",
  [process.env.OBSERVER_KEY]: "observer",
  [process.env.RECEPTIONIST_KEY]: "receptionist",
  [process.env.DEVELOPER_KEY]: "developer",
};

const requiredKeys = [
  "SAFETY_KEY",
  "OBSERVER_KEY",
  "RECEPTIONIST_KEY",
  "DEVELOPER_KEY",
  "JWT_SECRET",
];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length) {
  console.error("❌ Missing required access keys in .env:");
  missingKeys.forEach((key) => console.error(`- ${key}`));
  process.exit(1); // ⛔ Do not start the server
}

const JWT_SECRET = process.env.JWT_SECRET;

app.post("/api/auth/login", async (req, res) => {
  const { accessKey } = req.body;
  const role = ACCESS_KEYS[accessKey];

  console.log("🔐 Attempted login with:", accessKey);

  if (!role) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // 👈 500ms delay
    return res.status(401).json({ message: "Invalid access key" });
  }

  const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: "2h" });
  return res.json({ token, role });
});

if (process.env.NODE_ENV === "production") {
  // Serve static frontend (from Vite)
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // SPA fallback (for React Router, etc.)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with frontend URL if needed
    methods: ["GET", "POST"],
  },
});

try {
  initializeTables();
  console.log("🧱 Database tables ensured.");
} catch (err) {
  console.error("❌ Failed to initialize DB tables:", err);
} // 🔥 BOOM — your tables now initialize on backend start

let raceData = {
  raceName: "",
  raceStatus: "MAINTENANCE",
  currentFlag: "DANGER",
  remainingMillis: process.env.NODE_ENV.trim() === "development" ? 60000 : 600000,
  leaderboard: [],
};

(async () => {
  try {
    const leaderboard = await dbManager.getLeaderboard();
    const raceState = await dbManager.getRaceState(2);

    Object.assign(raceData, raceState, { leaderboard });

    const remainingMillis = process.env.NODE_ENV.trim() === "development" ? 60000 : 600000;
    if (raceData.remainingMillis === remainingMillis && raceData.raceStatus === "IN_SESSION") {
      raceData.raceStatus = "STARTING";
      raceData.currentFlag = "SAFE";
    }
    if (raceData.raceStatus === "IN_SESSION") {
      raceData.raceStatus = "STOPPED";
      raceData.currentFlag = "DANGER";
    }
  } catch (err) {
    console.error("❌ Error loading initial race data:", err);
  }
  console.log("✅ Initialized raceData");
})();

const lapTimers = new Map();
const pausedDrivers = new Set(); // 💡 Mark drivers for lap restoration

setupCountdown(handleFinishRace, handleTickUpdate);

// Handle finish race
async function handleFinishRace() {
  lapTimers.clear(); // Clear lap timers for all drivers
  raceData.raceStatus = "FINISHED";
  raceData.currentFlag = "FINISH";
  raceData.remainingMillis = 0;
  raceData.leaderboard = await dbManager.getLeaderboard();

  await dbManager.upsertRaceState(raceData, 2);
  io.emit("race:update", raceData);
  console.log("✅ Race finished and state updated.");
}

// 🕒 Handle Tick Update
function handleTickUpdate(newMillis) {
  raceData.remainingMillis = newMillis;
  io.emit("race:update", raceData); // ✅ always full raceData
}

/* 
raceStatuses can be: 
"STARTING" (greenlight, countdown),
-"IN_SESSION" (startRace, resumeRace),
-"FINISHED" (Countdown finished)
-"STOPPED"/"DANGER" (endRace premature stop),
-EXTRA "SUSPENDED" (serious error, server-error)
-EXTRA "MAINTENANCE" (track maintenance, endSession trigger only),

currentFlag can be:
-"SAFE" (normal operation),
-"HAZARD" (caution, yellow flag, race can continue),
-"DANGER" (emergency stop, red flag, race stopped),
-"FINISH" (good ending, checkered flag),
-EXTRA "ISE_DANGER" (serious error, server-error), 
*/

// 📡 Handle WebSocket Connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = { role: "guest" };
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload; // { role }
    next();
  } catch {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  console.log(`🔌 ${socket.user?.role} connected`);

  console.log("✅ Sending initial data to client");
  socket.emit("race:update", raceData);

  const raceSessions = await dbManager.getAllRaceSessions();
  socket.emit("updateSessions", raceSessions);

  socket.on("greenLight", async () => {
    try {
      lapTimers.clear(); // Clear lap timers for all drivers
      raceData.raceStatus = "STARTING";
      raceData.currentFlag = "SAFE";
      raceData.raceName = await dbManager.getUpcomingRaceName();
      raceData.remainingMillis = process.env.NODE_ENV.trim() === "development" ? 60000 : 600000;

      await dbManager.greenLightLeaderboard();
      await dbManager.resetRaceStates();
      await dbManager.upsertRaceState(raceData, 1); // Greenlight snapshot
      await dbManager.upsertRaceState(raceData, 2); // Also set latest at start

      raceData.leaderboard = await dbManager.getLeaderboard();
      console.log("📊 Emitting leaderboard:", raceData.leaderboard);
      io.emit("race:update", raceData);

      const updatedSessions = await dbManager.getAllRaceSessions();
      io.emit("updateSessions", updatedSessions); // ✅ Update all clients
    } catch (err) {
      console.error("Error in greenLight handler:", err);
    }
  });

  // 🎯 Start Race with Timer
  socket.on("startRace", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      raceData.raceStatus = "IN_SESSION";
      raceData.currentFlag = "SAFE";
      raceData.remainingMillis = process.env.NODE_ENV.trim() === "development" ? 60000 : 600000;

      await dbManager.upsertRaceState(raceData, 2);

      startRace(raceData.remainingMillis); // Start countdown with correct time
      io.emit("race:update", raceData); // Optional: let clients know race is live

      console.log("🏁 Race started successfully");
    } catch (err) {
      console.error("❌ Failed to start race:", err);
    }
  });

  socket.on("resetRace", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      console.log("Restarting the race");
      await dbManager.resetLeaderboardStats();
      const leaderboard = await dbManager.getLeaderboard();
      const raceState = await dbManager.getRaceState(1);

      // Merge data into raceData object
      Object.assign(raceData, raceState, { leaderboard });

      io.emit("race:update", raceData);

      await dbManager.upsertRaceState(raceData, 2);
      console.log("Successfully restarted race");
    } catch (err) {
      console.error("❌ Failed to restart race:", err);
    }
  });

  //Pausing the on-going race
  socket.on("pauseRace", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    stopInterval(); // Stop the countdown
    lapTimers.clear();
    raceData.raceStatus = "STOPPED";
    console.log("⏱️ Pausing race with", raceData.remainingMillis, "ms left");

    const leaderboard = await dbManager.getLeaderboard();
    leaderboard.forEach((driver) => {
      pausedDrivers.add(driver.carNumber); // 🟡 Mark for one-time skip
    });

    raceData.leaderboard = leaderboard;
    await dbManager.upsertRaceState(raceData, 2);
    io.emit("race:update", raceData);
    console.log("⏸️ Race paused. Lap timers cleared and laps adjusted.");
  });

  socket.on("resumeRace", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      raceData.raceStatus = "IN_SESSION";
      raceData.currentFlag = "SAFE";
      console.log("⏱️ Resuming race with", raceData.remainingMillis, "ms left");

      await dbManager.upsertRaceState(raceData, 2);

      startRace(raceData.remainingMillis); // Start countdown with correct time
      io.emit("race:update", raceData); // Optional: let clients know race is live

      console.log("🏁 Race resumed successfully");
    } catch (err) {
      console.error("❌ Failed to resume race:", err);
    }
  });

  // 🎯 Finish race, finish flag
  socket.on("finishRace", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    console.log("🔴 Manual finishRace triggered");
    stopInterval(); // Stop the countdown
    await handleFinishRace(); // Reuse the same logic
  });

  //deals with updating next-race
  socket.on("endSession", async () => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    raceData.raceStatus = "MAINTENANCE";
    raceData.currentFlag = "DANGER";
    raceData.remainingMillis = 0;

    await dbManager.upsertRaceState(raceData, 2);
    io.emit("race:update", raceData);

    //potentially add driver STATUSES as rollCall or smth, extra
  });

  //dealing with flags
  socket.on("changeFlag", async (flag) => {
    if (!["safety", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      const validFlags = ["SAFE", "HAZARD", "DANGER", "FINISH"];
      if (!validFlags.includes(flag)) {
        console.warn(`⚠️ Invalid flag received: ${flag}`);
        return;
      }

      raceData.currentFlag = flag;

      // Optional logic to update raceStatus based on flag
      // updateRaceStatusFromFlag(flag); // ← Can be added later if needed

      io.emit("race:update", raceData);
      await dbManager.upsertRaceState(raceData, 2);
      console.log(`🚩 Flag changed to: ${flag}`);
    } catch (err) {
      console.error("❌ Failed to update flag:", err);
    }
  });

  //dealing with the lap timers of drivers
  socket.on("recordLap", async (carNumber, callback) => {
    if (!["observer", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      const now = Date.now();
      const previousTime = lapTimers.get(carNumber);
      const wasPaused = pausedDrivers.has(carNumber);

      // On first call after resume — just reset timer
      if (!previousTime) {
        lapTimers.set(carNumber, now);

        // Skip lap increment, just mark ready to record next time
        if (wasPaused) {
          pausedDrivers.delete(carNumber);
          return callback?.({ success: true, message: "Lap tracking resumed" });
        }

        // First lap ever (greenlight)
        const { leaderboard, currentLap } = await dbManager.upsertLeaderboard(carNumber, 0, true);
        raceData.leaderboard = leaderboard;
        await dbManager.upsertRaceState(raceData, 2);
        io.emit("race:update", raceData);
        return callback?.({ success: true, message: "First lap recorded", currentLap });
      }

      const lapTime = (now - previousTime) / 1000;
      lapTimers.set(carNumber, now);

      const { leaderboard, currentLap, fastest } = await dbManager.upsertLeaderboard(
        carNumber,
        lapTime
      );
      raceData.leaderboard = leaderboard;
      await dbManager.upsertRaceState(raceData, 2);
      io.emit("race:update", raceData);

      callback?.({ success: true, lapTime, currentLap, fastest });
    } catch (err) {
      console.error("❌ recordLap error:", err);
      callback?.({ error: "Lap record failed" });
    }
  });

  // 🎯 Add New Race Session
  socket.on("addRaceSession", async (raceName, drivers, callback) => {
    if (!["receptionist", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    console.log("Received raceName:", raceName);
    console.log("Received drivers:", drivers);
    try {
      await dbManager.addRaceSession(raceName, drivers);
      console.log("Race session successfully added to the database.");

      const updatedSessions = await dbManager.getAllRaceSessions();
      io.emit("updateSessions", updatedSessions); // ✅ Update all clients
      callback({ success: true });
    } catch (err) {
      console.error("Error adding race session:", err.message);
      callback({ error: err.message });
    }
  });

  // 🎯 Remove a Race Session
  socket.on("removeRaceSession", async (id, callback) => {
    if (!["receptionist", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      await dbManager.removeRaceSession(id);
      console.log("Race session successfully deleted from the database.");
      // Emit updated sessions to all clients
      const updatedSessions = await dbManager.getAllRaceSessions();
      io.emit("updateSessions", updatedSessions);
      callback({ success: true });
    } catch (err) {
      console.error("Couldn't delete race session:", err);
      callback({ error: err.message });
    }
  });

  socket.on("editRaceSession", async (id, updatedSession, callback) => {
    if (!["receptionist", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    if (!id || !updatedSession) {
      return callback?.({ error: "Invalid session data provided." });
    }

    try {
      await dbManager.editRaceSession(id, updatedSession);
      const updatedSessions = await dbManager.getAllRaceSessions();
      io.emit("updateSessions", updatedSessions);
      callback?.({ success: true });
    } catch (err) {
      console.error("Couldn't update race session:", err);
      callback?.({ error: err.message });
    }
  });

  socket.on("reorderRaceSession", async (id, direction, callback) => {
    if (!["receptionist", "developer"].includes(socket.user?.role)) {
      console.warn("🚫 Unauthorized attempt to send socket event");
      return;
    }
    try {
      await dbManager.reorderRaceSession(id, direction);
      console.log("Race session successfully reordered in the database.");
      // Emit updated sessions to all clients
      const updatedSessions = await dbManager.getAllRaceSessions();
      io.emit("updateSessions", updatedSessions);
      callback({ success: true });
    } catch (err) {
      console.error("Couldn't reorder race session:", err);
      callback({ error: err.message });
    }
  });

  socket.on("fetchRaceData", async (callback) => {
    try {
      socket.emit("race:update", raceData);
      callback({ success: true });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  socket.on("fetchSessions", async (callback) => {
    try {
      const sessions = await dbManager.getAllRaceSessions();
      socket.emit("updateSessions", sessions);
      callback({ success: true });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // ❌ Handle Disconnection
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });

  //closing bit for io.on("connection"), (socket), so just insert needed bits before THIS COMMENT
});

// 🌐 Basic route
app.get("/", (req, res) => {
  res.send("🏁 Racetrack Backend Server is Alive!");
});

// 🚀 Launch server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

// Open frontend in browser
const AUTO_OPEN = process.env.AUTO_OPEN !== "false";

if (AUTO_OPEN) {
  console.log("🌐 Opening frontend in browser...");
  const frontPORT = process.env.NODE_ENV === "development" ? 5173 : PORT;
  (async () => {
    const open = (await import("open")).default;
    await open(`http://localhost:${frontPORT}/`);
  })();
}
