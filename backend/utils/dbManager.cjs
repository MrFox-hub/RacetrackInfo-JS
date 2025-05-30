const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "racetrack.db");

// OPEN_CREATE ensures the file is created if it doesn't exist
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ [DB] Connected to racetrack.db");
  }
});

// ──────────────── Table Initialization ────────────────
function initializeTables() {
  db.serialize(() => {
    console.log("Initializing tables");

    db.run(`CREATE TABLE IF NOT EXISTS race (
      id INTEGER PRIMARY KEY,
      raceName TEXT,
      raceStatus TEXT,
      currentFlag TEXT,
      remainingMillis INTEGER
    )`); // deals with currentRace-related fluff that is not driver-specific (flag, timer, racename etc.)

    db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
      carNumber INTEGER PRIMARY KEY,
      driverName TEXT,
      fastestLap REAL,
      currentLap INTEGER
    )`); // deals with currentRace-related driver-specific data (position, fastest lap, laps completed, EXTRA: status)

    db.run(`CREATE TABLE IF NOT EXISTS raceSessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raceName TEXT,
      drivers TEXT,
      position INTEGER
    )`); // all the upcoming races??? just the drivers + their car numbers + raceName + idk
  });
}

// Add race session
function addRaceSession(raceName, drivers) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      drivers = JSON.stringify(drivers);
      db.get("SELECT MAX(position) AS maxPos FROM raceSessions", (err, row) => {
        const newPos = (row?.maxPos ?? 0) + 1;
        const stmt = db.prepare(
          "INSERT INTO raceSessions (raceName, drivers, position) VALUES (?, ?, ?)"
        );
        stmt.run(raceName, drivers, newPos, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
        stmt.finalize();
      });
    });
  });
}

// Remove race session by id
function removeRaceSession(id) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stmt = db.prepare("DELETE FROM raceSessions WHERE id = ?");
      stmt.run(id, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ raceSession with id ${id} removed`);
          try {
            await reorderRaceSessionPositions(); // 👈 Reorder after deletion
            resolve();
          } catch (reorderErr) {
            reject(reorderErr);
          }
        }
      });
      stmt.finalize();
    });
  });
}

// Reorder race sessions
function reorderRaceSessionPositions() {
  return new Promise((resolve, reject) => {
    db.all("SELECT id FROM raceSessions ORDER BY position ASC", (err, rows) => {
      if (err) {
        return reject(err);
      }

      const updateStmt = db.prepare("UPDATE raceSessions SET position = ? WHERE id = ?");
      rows.forEach((row, index) => {
        updateStmt.run(index + 1, row.id);
      });

      updateStmt.finalize((finalizeErr) => {
        if (finalizeErr) {
          reject(finalizeErr);
        } else {
          console.log("✅ raceSessions reordered by position");
          resolve();
        }
      });
    });
  });
}

// Get upcoming race name
function getUpcomingRaceName() {
  return new Promise((resolve, reject) => {
    db.get("SELECT raceName FROM raceSessions ORDER BY position ASC LIMIT 1", (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.raceName : null);
      }
    });
  });
}

// Save race data to the database

function upsertRaceState(raceData, id) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO race (id, raceName, raceStatus, currentFlag, remainingMillis)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        raceName=excluded.raceName,
        raceStatus=excluded.raceStatus,
        currentFlag=excluded.currentFlag,
        remainingMillis=excluded.remainingMillis
    `;

    db.run(
      query,
      [id, raceData.raceName, raceData.raceStatus, raceData.currentFlag, raceData.remainingMillis],
      function (err) {
        if (err) {
          console.error(`❌ Failed to upsert race state with id ${id}:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

// Track lap for a car and update leaderboard & race state
function upsertLeaderboard(carNumber, lapTime, isFirstLap = false) {
  return new Promise((resolve, reject) => {
    if (isFirstLap) {
      const stmt = db.prepare("UPDATE leaderboard SET currentLap = 1 WHERE carNumber = ?");
      stmt.run(carNumber, async (err) => {
        stmt.finalize();
        if (err) return reject(err);
        const leaderboard = await getLeaderboard();
        resolve({ leaderboard, currentLap: 1, fastest: false });
      });
      return;
    }

    db.get(
      "SELECT fastestLap, currentLap FROM leaderboard WHERE carNumber = ?",
      [carNumber],
      (err, row) => {
        if (err || !row) return reject(err || new Error("Driver not found"));

        const newFastest = !row.fastestLap || lapTime < row.fastestLap;
        const nextLap = (row.currentLap || 0) + 1;

        const stmt = db.prepare(`
          UPDATE leaderboard
          SET currentLap = ?, ${newFastest ? "fastestLap = ?," : ""} carNumber = carNumber
          WHERE carNumber = ?
        `);
        const args = newFastest ? [nextLap, lapTime, carNumber] : [nextLap, carNumber];

        stmt.run(...args, async (updateErr) => {
          stmt.finalize();
          if (updateErr) return reject(updateErr);

          const leaderboard = await getLeaderboard();
          resolve({ leaderboard, currentLap: nextLap, fastest: newFastest });
        });
      }
    );
  });
}

function resetLeaderboardStats() {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE leaderboard
      SET fastestLap = NULL,
          currentLap = NULL
    `;

    db.run(query, function (err) {
      if (err) {
        console.error("❌ Failed to reset leaderboard stats:", err.message);
        reject(err);
      } else {
        console.log("🔁 Leaderboard stats reset successfully.");
        resolve();
      }
    });
  });
}

// reset race table just in case
function resetRaceStates() {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM race WHERE id IN (1, 2)", (err) => {
      if (err) {
        console.error("❌ Failed to clear race states:", err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// get race from savestate
function getRaceState(id) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT raceName, raceStatus, currentFlag, remainingMillis FROM race WHERE id = ?",
      [id],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row); // no `id` in the result anymore
        }
      }
    );
  });
}

// Green light leaderboard (wipes old leaderboard and loads in new session, deletes from raceSessions)
function greenLightLeaderboard() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM leaderboard", (err) => {
        if (err) {
          console.error("❌ Error deleting leaderboard:", err.message);
          reject(err);
        } else {
          getUpcomingRaceName()
            .then((raceName) => {
              if (!raceName) {
                console.log("⚠️ No upcoming race session found");
                resolve();
                return;
              }

              db.get("SELECT * FROM raceSessions WHERE raceName = ?", raceName, (err, row) => {
                if (err) {
                  console.error("❌ Error retrieving race session:", err.message);
                  reject(err);
                } else if (!row) {
                  console.warn("⚠️ Race session not found even though name existed");
                  resolve();
                } else {
                  const driverList = JSON.parse(row.drivers);

                  const stmt = db.prepare(
                    "INSERT INTO leaderboard (carNumber, driverName) VALUES (?, ?)"
                  );
                  driverList.forEach((driver) => {
                    stmt.run(driver.carNumber, driver.name);
                  });
                  stmt.finalize();

                  // Remove processed raceSession by its `position`, not `id`
                  db.run(
                    "DELETE FROM raceSessions WHERE position = ?",
                    row.position,
                    async (deleteErr) => {
                      if (deleteErr) {
                        console.error(
                          "❌ Error deleting processed race session:",
                          deleteErr.message
                        );
                        reject(deleteErr);
                      } else {
                        console.log(`✅ Race session with position ${row.position} removed`);
                        await reorderRaceSessionPositions(); // 👈 Reorder after deletion
                        resolve();
                      }
                    }
                  );
                }
              });
            })
            .catch((err) => {
              console.error("❌ Error retrieving upcoming race name:", err.message);
              reject(err);
            });
        }
      });
    });
  });
}

// Get leaderboard (already sorted by fastestLap, currentLap, carNumber)
function getLeaderboard() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM leaderboard
       ORDER BY
         CASE
           WHEN fastestLap IS NOT NULL THEN 0
           WHEN currentLap IS NOT NULL THEN 1
           ELSE 2
         END,
         fastestLap ASC,
         currentLap DESC,
         carNumber ASC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// Get all race sessions
function getAllRaceSessions() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM raceSessions ORDER BY position ASC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Edit race session
function editRaceSession(id, updatedSession) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("UPDATE raceSessions SET raceName = ?, drivers = ? WHERE id = ?");
    stmt.run(updatedSession.raceName, JSON.stringify(updatedSession.drivers), id, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    stmt.finalize();
  });
}

// Reorder race session
function reorderRaceSession(sessionId, direction) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM raceSessions WHERE id = ?", [sessionId], (err, current) => {
      if (err || !current) return reject("Session not found");

      const comparator = direction === 1 ? "<" : ">";
      const order = direction === 1 ? "DESC" : "ASC";

      db.get(
        `SELECT * FROM raceSessions WHERE position ${comparator} ? ORDER BY position ${order} LIMIT 1`,
        [current.position],
        (err, neighbor) => {
          if (err || !neighbor) return reject("No adjacent session to swap");

          // Swap positions
          const stmt1 = db.prepare("UPDATE raceSessions SET position = ? WHERE id = ?");
          stmt1.run(neighbor.position, current.id);
          stmt1.finalize();

          const stmt2 = db.prepare("UPDATE raceSessions SET position = ? WHERE id = ?");
          stmt2.run(current.position, neighbor.id);
          stmt2.finalize();

          resolve();
        }
      );
    });
  });
}

// ──────────────── Exports ────────────────
module.exports = {
  db,
  upsertLeaderboard,
  initializeTables,
  addRaceSession,
  removeRaceSession,
  getUpcomingRaceName,
  greenLightLeaderboard,
  getLeaderboard,
  getAllRaceSessions,
  editRaceSession,
  reorderRaceSession,
  upsertRaceState,
  upsertLeaderboard,
  resetLeaderboardStats,
  resetRaceStates,
  getRaceState,
  resetLeaderboardStats,
};
