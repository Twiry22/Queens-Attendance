# Queen's Attendance — Offline-First PWA

An offline-capable event check-in app with automatic sync, built like KoboCollect.

## Project structure

```
queens-attendance/
├── backend/
│   ├── server.js          ← Express + SQLite backend
│   ├── package.json
│   └── attendance.db      ← auto-created on first run
└── public/
    ├── index.html
    ├── manifest.json      ← PWA config
    ├── sw.js              ← Service worker (offline caching)
    ├── css/style.css
    └── js/
        ├── db.js          ← IndexedDB (offline storage)
        ├── sync.js        ← Push unsynced records to server
        └── app.js         ← UI logic
```

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Start the server

```bash
npm start
```

The server runs at **http://localhost:3000**

### 3. Open the app

Go to http://localhost:3000 in Chrome or Edge.

To make it installable on phones on the same WiFi network:
- Find your computer's IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Share **http://192.168.x.x:3000** with attendees
- They open it in their browser → tap "Add to Home Screen"

## How offline sync works

| Situation | What happens |
|---|---|
| WiFi on | Records save to IndexedDB + immediately sync to SQLite on server |
| WiFi off | Records save to IndexedDB only (orange dot in Records tab) |
| WiFi comes back | App auto-syncs all pending records in the background |
| Manual sync | Tap "Sync now" in the Records tab |

## Customise sub-groups

Edit the `SUBGROUPS` array at the top of `public/js/app.js`:

```js
const SUBGROUPS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Zeta', 'Other'];
```

## Export records

- Open the Records tab → tap **Export CSV**
- Or go directly to: http://localhost:3000/export.csv

## API endpoints (for reference)

| Method | Path | Description |
|---|---|---|
| POST | /sync | Receive offline records from client |
| GET | /records | All records (JSON) |
| GET | /export.csv | Download all records as CSV |
| DELETE | /records | Clear all records |
