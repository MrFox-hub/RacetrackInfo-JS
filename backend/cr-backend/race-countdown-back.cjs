let raceInterval = null;
const TICK_RATE = 500;
let DEFAULT_MILLIS = 600000;

let _onFinishRace = () => {};
let _onTickUpdate = () => {};

function setupCountdown(onFinishRaceCallback, onTickCallback) {
  DEFAULT_MILLIS = process.env.NODE_ENV.trim() === "development" ? 60000 : 600000;
  _onFinishRace = onFinishRaceCallback;
  _onTickUpdate = onTickCallback;
}

function startRace(remainingMillis = DEFAULT_MILLIS) {
  if (raceInterval) return;
  startInterval(remainingMillis);
}

function startInterval(remainingMillis) {
  raceInterval = setInterval(() => {
    remainingMillis -= TICK_RATE;
    _onTickUpdate(remainingMillis); // ✅ Pass millis back to server

    if (remainingMillis < TICK_RATE) {
      stopInterval();
      _onFinishRace();
      console.log("🟡 Countdown finished: finishing race.");
    }
  }, TICK_RATE);
}

function stopInterval() {
  clearInterval(raceInterval);
  raceInterval = null;
}

module.exports = {
  setupCountdown,
  startRace,
  stopInterval,
};
