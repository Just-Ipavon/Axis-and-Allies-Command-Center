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

**A real-time, asynchronous web application designed to digitize the complex macroeconomics and operational history of tabletop matches for _Axis & Allies: 1942 Second Edition_.**

</div>

---

## 🧭 Architectural Overview

The project relies on a **Monorepo** approach with a heavily asynchronous, real-time infrastructure. By eliminating page reloads and basing the entire state management on full-duplex WebSockets, players can watch nation dashboards (funds, industrial complexes, structural damage, production queues) update instantly across their tablets and smartphones as actions occur.

The **Backend Server** (Express) plays a dual technical role: it provides WebSocket APIs while persisting data to a physical SQLite file, and it also acts as a **Static Web Server** to natively serve the pre-compiled React bundles (`dist/`).

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="24" height="24" align="center" /> The Frontend (Visual Controller)

Developed using the Modern React Stack (`Vite`, `React Hooks`) and fully styled via utility-first `TailwindCSS` with a military-inspired vintage theme.

### UI Component Tree (`/frontend/src/components/`)

- **`LobbyScreen.jsx`**: The isolated entryway. It fetches the available operations via RestAPI and supports the new **Direct Connect** feature. You can join private/public rooms using either the full Title or a unique, 6-character hexadecimal Room ID (e.g. `#8FK2J1`). Password challenges are handled dynamically.
- **`NationCard.jsx`**: The primary player interaction controller. Handles:
  - **Dynamic Factory Capacity**: Iterates through pending `purchases`, matching base capacities bound to rigid 1942 rules (`eastern US -> max 12`), actively subtracting structural `damage`.
  - **In-App Combat Modal**: Inserts a conditional modal to manage territory conquests seamlessly, instantly draining/enriching targeted IPC budgets.
- **`MiniNationCard.jsx`**: A minimal, destructured grid-module used to render a read-only global overview of all enemy nations, providing unparalleled table supervision.

### Global State Management (`/frontend/src/store/gameStore.js`)

The _gameStore_ functions as a Memory Frontier and Socket Dispatcher:

- **Intelligent Role Persistence**: Connects users to previous sessions role on crashes. The new Smart-Switch logic instantly purges out-of-date roles if a user deliberately shifts from one Operation lobby to another.
- **WebHooks Event Handler**: Complex interactions like `updateFactoryDamage` or `transferFactory` are handled immutably and synced via background `socket.emit` dispatches, leaving the UI exceptionally clean.

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="24" height="24" align="center" /> The Backend Server

The core logic lies strictly within `server.js` and securely isolated inside `db.js`. It intentionally avoids ORMs to maximize concurrency performance on heavy WebSocket payload traffic using native SQL.

### `server.js` - Routing & Socket Handlers

- **Unique Operation Identifiers**: Creates random JS Hex IDs directly mapping them to custom-created "Room Titles" in the database.
- **Concurrency Mitigation (Smart Play-time)**: When all sockets disconnect, the script catches the departure `Date.now()`. Upon any subsequent `joinGame`, it safely restores the progression timer bypassing client-pollers and ensuring 100% time accuracy.
- **Security Check**: Header limits enforced by `helmet` and phantom-session scraping contained on `/api/` endpoints via `express-rate-limit`.

### `db.js` - SQLite Sub-transactions

- **Factory Status Evaluation**: SQLite logically executes structural `REPAIR`, accepting IPC withdrawals only if the asynchronous Bank verification evaluates as positive (`bank >= cost`).
- **Dynamic Infrastructure Transfers**: Triggers macro-queries that shift entire `factories` JSON blocks from victim to conqueror, forcefully resetting temporary `repairedThisTurn` increments.
- **Game Data Cleanup**: In the boot phase (`initDb`), it actively flushes empty or malformed rooms left hanging by fatal server stops.

### `gameConfig.js` - Hard-coded Rules Isolation

All deterministic starting values for the _"Second Edition 1942"_ rulebook are strictly detached from runtime logic:

- **Starting Incomes**: `USSR(24)`, `Germany(41)`, `UK(31)`, `Japan(30)`, `USA(42)`.
- **Infrastructure Compliance**: Validated matching capacities across historically accurate zones.

---

## 🖥 Production Deployment Guide

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
