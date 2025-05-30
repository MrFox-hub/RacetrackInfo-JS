# 🏁 Racetrack Info-Screens
Beachside Racetrack's very own info screens.
A real-time system designed to keep everyone informed, exactly when it matters.

Powered by Node.js, live-connected through Socket.IO, and backed by SQLite for reliable data storage.

---
## 🎯 Features
- #### Vite.js > Instant updates without full reload (Dev mode frontend only)
- #### React.js > Racing session frontend with state sync (Use Effect)
- #### ESLint + Prettier – Clean, consistent code every time
- #### Socket.IO > Instant client-server sync pipeline
- #### SQLite > Minimal, reliable backend data layer

*You may make use of NodeJS packages for this task.*

### 🧭Additional Features:
- Danger Flag – Suspends race activity to ensure fair play
- Resume / Reset Race – Restore session to active or greenlight state
- Dynamic Login System – Access control per role (see “Security & Access Control”)
- Auto-Launch Frontend – Automatically opens main page when backend starts
- Developer Scripts – Simple Bash scripts for running frontend and backend
- raceStateManager – Central controller for race state logic and transitions (see Extra Features)

---

## 🔐 Security & Access Control

Access is granted only after successful login using predefined keys. No usernames required — just a valid password (key).

All staff **must be logged in** to appear on the system dashboard. No login = no visibility, even if the server is running.

A **logout feature** is also available for switching roles or stepping away from the session.

### 🗝️Key Features

- 500ms delay on invalid login attempts (anti-brute force)
- Dynamic login system — roles are determined by access key only
- Server startup is blocked unless all required `.env` keys are present

### 🟩Access Matrix

| Interface             | Env Variable        | Staff Role        |
|-----------------------|---------------------|-------------------|
| `/front-desk`         | `RECEPTIONIST_KEY`  | Reception          |
| `/race-control`       | `SAFETY_KEY`        | Safety Official    |
| `/lap-line-tracker`   | `OBSERVER_KEY`      | Lap Observer       |
| *(no route)*          | `DEVELOPER_KEY`     | Administrator      |


> 🚫 **Don't share your password.**  
> Even if it's just `racing123`, you're better than that.  
> This isn't 2010 — and you're not signing into Club Penguin.

---


## ⚙️ Tech Stack / Technologies

- 🧠 **Backend:**  Node.js (CommonJS), ESLint-configured
    
- ⚡ **Real-time:** Socket.IO
    
- 💾 **Database:** SQLite (`sqlite3`)
    
- 🧩 **Frontend:** React (Vite-powered for fast development)
    
- 🌐 **External Access:**  Ngrok (for secure public tunnels during testing)

- 🔧**Ease of Access:** Bash Scripts
    
---

## 🛠️ Setup Instructions

### 📋 Prerequisites

Before installation, ensure you have:

- ✅ `Node.js` v22.18.0 installed
    
- ✅ `npm` installed
    
- ✅ A terminal/command-line interface
    
- ✅ Environment variable file `.env` prepared with access credentials (/~/racetrack/backend/.env)

### 1️⃣ Clone + install dependencies:

```bash
git clone https://github.com/MrFox-hub/racetrackInfo-JS
cd racetrackinfo-JS
```

---

### 2️⃣ Configure `.env` variable

Create a file called `.env` in the root, if already not existing:
relative pathing is: /~/racetrack/backend/.env

```env
PORT=5000 
# *You may edit port, default will be 5000*
RECEPTIONIST_KEY=receptionist
# *INSERT ANY PASSWORD HERE*
OBSERVER_KEY=observer
# *INSERT ANY PASSWORD HERE*
SAFETY_KEY=safety 
# *INSERT ANY PASSWORD HERE*
DEVELOPER_KEY=superadmin123 
# *(dont) INSERT ANY PASSWORD HERE*
JWT_SECRET=your-very-secret 
# *Password will be inserted for you*
AUTO_OPEN=true
# *Choose whether you want browser to automatically open on server start*
```


---


### 3️⃣ Start the server

#### Standard/Production mode (10-min races)

```bash
cd backend/
npm install
npm start
```
- Server runs at `http://localhost:5000`

#### Dev mode (1-min races)

Create/Split 2 terminals
one for frontend, other for backend...

Terminal 1
```bash
cd frontend/
npm install
npm run dev
```

Terminal 2
```bash
cd backend/
npm install
npm run dev
```

- Frontend runs at `http://localhost:5173`
- Backend runs at `http://localhost:5000` (Only displays activity status (Live/*Not Live*))
    
#### 4️⃣ Making server accessible to others via ngrok

Go to <https://dashboard.ngrok.com/signup> and make an account if you don't already have one.

In the ngrok Dashboard → Go to "Auth" section.
(Or find it at https://dashboard.ngrok.com/get-started/your-authtoken)

You will see something like:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_STRING
```
Example:
```bash
ngrok config add-authtoken 2Pz9x4KFFRiV8Kc0u_6GXeD6FpS_7BdYZcTb9abcd
```

Copy that authtoken command.

Create another terminal and run:

```bash
sudo npm install -g ngrok
ngrok config add-authtoken YOUR_AUTHTOKEN_STRING
```

Now whenever you want to make your server publicly available, run:
```bash
ngrok http 5000
```

Look for this line (or similar):

```bash
Forwarding https://db05-85-29-210-177.ngrok-free.app -> http://localhost:5000
```
This is now the link to your website.
Congratulations, your web app is now publicly available!

---

## 📖 Staff-Users Guide

## 🖥️ `/front-desk` — Receptionist

Interface for managing pre-race setup, sessions, and drivers.

### ✏️ Core Features

- ➕ **Add / Edit / Remove Race Sessions** – Manage upcoming races
- 👥 **Add / Edit / Remove Drivers** – Assign car numbers and driver names
- 🔢 **25 Character Limit** – Enforced on Race Name and Driver Name fields, preventing overflow
- 🚫 **Duplicate Name Checker** – Prevents reuse of names across Race Names and Driver Names within a session
- 💾 **Edit & Save RaceSession** – Update and persist session data
- ⌨️ **Keyboard Shortcut** – Press `Enter` to quickly add a driver


### 🕹️ `/race-control` — Safety Official

Interface used by race control staff to manage the live session flow and safety operations.

#### 🛑 Core Controls

- ✅ **Greenlight** – Marks race as safe and ready to begin
- 🏁 **Start Race** – Begins the race and triggers countdown
- 🚩 **Flags System** – Controls live race mode
  - 🔴 **Danger Flag** – Pauses the race (emergency stop)
  - 🏁 **Finish Flag** – Ends the race gracefully
- 🏴 **End Session** – Terminates the current race session and resets environment
    
### 🏎️ `/lap-line-tracker` — Lap Observer

Interface for manually tracking lap completions by car number.

#### 📸 Core Features

- 📱 **Landscape / Portrait Mode** – Responsive layout for various screen orientations
- 🎛️ **Interactable Buttons** – Tap-to-record for each car/lap
- 💤 **No-Race Safeguard** – Buttons are hidden when no race is active
- 🚫 **Double-Click Protection** – Temporary button disable to prevent accidental double-taps


### Public Display Interfaces run on large screens:

- #### 🧮 **Leaderboard** (`/leaderboard`)
  Displays the current race name, participating drivers, and all key metadata:
  - Car numbers
  - Fastest lap times
  - Current lap per driver
  - Race-wide metadata: timer, race status, and current flag

- #### 😎 **Next Race** (`/next-race`)
  Shows the upcoming race name and its full driver list:
  - Driver names
  - Assigned car numbers

- #### ⏲️ **Race Countdown** (`/race-countdown`)
  Displays a massive countdown clock:
  - Full-screen view
  - Blinks as timer nears zero

- #### 🏳️ **Race Flags** (`/race-flags`)
  Displays the current race flag in fullscreen:
  - Bold flag visuals for safety states
  - Subtle wave animation when race is finished



---

## 💡 Extra Features

#### 💾 Data Persistence
Dynamic `raceState` saving system that captures all vital info, including:
- Upcoming Race Sessions
- Race Metadata (raceName, Timer, Flag, Status, Leaderboard)
- Leaderboard (Position, Car Number, Driver Name, Fastest Lap, Current Lap)

Race metadata is stored in two forms:
1. **Greenlight Snapshot** – Captured pre-`StartRace` (Soft Reset point)
2. **Live RaceState** – Continuously updated on every `lapUpdate`, `flagUpdate`, etc.

On server restarts:
- The session resumes from the **last saved state**, just before shutdown (assuming DB is intact)
- The race is **automatically suspended** to ensure fairness (since we can’t track what happened during downtime)

---

#### 🖱️ Manual Car Assignment Option
While car numbers auto-increment by default, users can select their **preferred car number (01–99)**.  
This accommodates lucky numbers, themed cars, or special requests — provided that number isn’t already taken.

---

#### 🥺 Soft Reset Race
Triggered during Danger Flag situations to **pause all race activity**:
- Timer stops
- Lap tracker packets are ignored
- Ensures fair race conditions during unexpected events

Users are given three options:
- **A – Resume Race** from the same timer
- **B – Soft Reset** the race (timer resets to 10 minutes, stats wiped)
- **C – End Session** completely if needed

Upon resume, all drivers must return to the **safety pit** and drive out one-by-one for clean restart tracking.

---

#### ⌨️ KeyBoard Event UX
- In Reception: `Enter` adds drivers, `Tab` navigates between fields
- Fullscreen toggle detection supported for seamless viewing

All designed with end-user convenience in mind.

---

#### 👔 Administrator
One privileged staffer role with **oversight across all interfaces**.  
Think: "npm run dev" but **same same... but differrrrreeeeennnt** — total access, full visibility, god-tier energy.


#### 🧠 Race State Terminology

We manage two key session snapshots:

🔁 **Soft Reset** – *Greenlight Snapshot*  
- Captured right after “Safe to Start”  
- No laps, timer not started  
- Used to revert to pre-race state  
- DB Snapshot Type: `1`

⏱️ **Latest Snapshot** – *Live/Paused/Finished State*  
- Continuously updated during the race  
- Includes lap times, current flag, remaining time  
- Used to resume or finalize race  
- DB Snapshot Type: `2`

🔧 Typical Usage:
- `softReset()` → Restore greenlight state
- `resumeRace()` → Restore latest race progress
- `upsertRaceState(data, 1)` → Save Soft Reset snapshot
- `upsertRaceState(data, 2)` → Save Latest Snapshot


---

## 👥 Authors

This project was developed and maintained by Martti Rebane, Mikk Vaarmari, and Mattias Simson. 
Feel free to reach out for collaboration or improvements.
Email of Martti
``` 
Rebanemartti@gmail.com
```


