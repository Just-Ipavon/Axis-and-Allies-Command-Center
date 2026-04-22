<div align="center">

# 🎖️ Axis & Allies: Command Center

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
<br>
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)

<br>

**A real-time, asynchronous web application designed to digitize the complex macroeconomics and operational history of tabletop matches for _Axis & Allies_.**
![screenshot](https://cdn.imgchest.com/files/1d98740960dd.png)

</div>

---

## 📖 What is this app?

**Axis & Allies: Command Center** is your digital assistant for tabletop matches of **Axis & Allies: 1942**. Say goodbye to pen, paper, and manual calculations! This app lets you and your friends focus on strategy by handling the complex math, economy, and logistics directly from your smartphones or tablets.

### Key Features

- **Smart Purchasing:** Buy units with ease. The app automatically calculates your remaining IPCs (money) and strictly enforces your factory production limits.
- **Factory Exchanges:** When territories change hands on the board, simply transfer the factory to the conquering nation with a single tap. The system automatically adjusts incomes and updates production capacities for both players.
- **Action Log:** Every purchase, combat result, and factory transfer is recorded in a global activity log. No more forgotten transactions or arguing over who bought what!
- **Real-Time Sync:** See what your allies and enemies are doing instantly. The app updates everyone's screens in real-time as actions happen—no need to reload the page.
- **Game Timer:** Keep track of how long your global war has been going on. If you need to stop your session, the timer completely saves your progress and resumes when you gather to play again.
- **Direct Connect:** Join private/public rooms using the unique, 6-character hexadecimal Room ID (e.g. `#8FK2J1`).
- **Automatic Turn Order:** The app automatically advances the turn order based on the game rules when income is collected.

---

## Architectural Overview

The project relies on a **Monorepo** approach with a heavily asynchronous, real-time infrastructure. By eliminating page reloads and basing the entire state management on full-duplex WebSockets, players can watch nation dashboards (funds, industrial complexes, structural damage, production queues) update instantly across their tablets and smartphones as actions occur.

The **Backend Server** plays a dual technical role: it provides WebSocket APIs while persisting data to a physical SQLite file, and it also acts as a **Static Web Server** to natively serve the pre-compiled React bundles (`dist/`).

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="24" height="24" align="center" /> Frontend

The frontend follows a **Feature-Based Architecture**, separating pages from UI components and business logic.

### Pages & Routing (`/frontend/src/pages/`)

- **`LobbyPage.jsx`**: The isolated entryway. It fetches the available operations via RestAPI and supports the **Direct Connect** feature.
- **`GamePage.jsx`**: The main command center. It orchestrates the game state and coordinates the various feature components.

### Feature Components (`/frontend/src/features/`)

- **Lobby Components**:
  - **`LobbyScreen.jsx`**: Manages room discovery, password challenges, and the creation of new operations.
- **Game Components**:
  - **`GameHeader.jsx`**: Displays operational status, game code, sequence/turn order, and the mission timer.
  - **`GameMain.jsx`**: The primary interaction zone. It dynamically renders `NationCard` (for active roles) or `MiniNationCard` (for global overview).
  - **`GameSidebar.jsx`**: Hosts the real-time **Communication Log** and high-level administrative controls.

### Custom Hooks (`/frontend/src/hooks/`)

- **`useTimer.js`**: An encapsulated hook that handles the high-precision mission clock, ensuring accurate play-time tracking across sessions.

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="24" height="24" align="center" /> Backend Server

### Modular Architecture (`/backend/src/`)

- **`server.js`**: The main entry point. It bootstraps the Express server and initializes the Socket.io orchestrator.
- **`routes/`**: Handles traditional RestAPI endpoints (e.g., room discovery and deletion).
- **`sockets/`**: Contains the full-duplex communication logic. Handlers are split by feature (`gameHandlers.js`, `nationHandlers.js`).
- **`models/`**: Centralized data access layer.
  - **`index.js`**: The primary entry point that initializes the database and exports all models.
  - **`gameModel.js`, `nationModel.js`, `logModel.js`**: Domain-specific query logic.

### Data Layer (`/backend/src/database/`)

- **`connection.js`**: Manages the SQLite connection pool with **WAL (Write-Ahead Logging)** mode for high-concurrency stability.
- **`init.js`**: Handles table schema definitions and automated data cleanup.

### Rules Isolation (`/backend/src/config/gameConfig.js`)

All deterministic starting values for the _"Second Edition 1942"_ rulebook are strictly detached from runtime logic, ensuring the engine remains agnostic of specific board-game balancing.

---

## Production Deployment Guide

Since the Backend Application simultaneously serves the compiled React build, no intermediary dev servers are required for production. Use the robust process manager `PM2` to automatically cluster Node processes in the background:

```html
<!-- 1. Clone the repo and setup `.env` -->
<kbd>cp backend/.env.example backend/.env</kbd>

<!-- 2. Generate optimized static assets for the React interface -->
<kbd>cd frontend</kbd>
<kbd>npm install && npm run build</kbd>

<!-- 3. Final Cluster Bootstrap via PM2 process manager -->
<kbd>cd ../backend</kbd>
<kbd>npm install</kbd>
<kbd>pm2 start server.js --name "axis-companion"</kbd>

<!-- 4. Seal the dump to ensure startup at the next physical Linux machine boot -->
<kbd>pm2 save</kbd>
```
