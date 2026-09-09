# ReclaimIt — Campus Lost & Found

## Quick Start (Windows)

### Option 1: Double-click (easiest)
1. Double-click **`start-all.bat`** in the project folder
2. Open **http://localhost:5173** in your browser

### Option 2: Manual (two terminals)

**Backend** (from project root `ReclaimIt`):
```cmd
node server.js
```

**Frontend** (from `ReclaimIt/client`):
```cmd
node node_modules\vite\bin\vite.js
```

### If `npm` fails in PowerShell

PowerShell may block npm with "running scripts is disabled". Use one of these:

```cmd
npm.cmd run dev
```

Or run node directly (no npm needed):
```cmd
node server.js
```

Or use the `.bat` files included in this project.

---

## URLs

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:5000        |
| Health   | http://localhost:5000/api/health |

---

## Environment (.env)

Required variables in `.env` at project root:

```
PORT=5000
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

---

## Troubleshooting

**Port 5000 already in use**
```cmd
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**MongoDB connection failed**
- Check `MONGODB_URI` starts with `MONGODB_URI=` (not a bare URL)
- On Windows, use `mongodb://` format instead of `mongodb+srv://`
- Whitelist your IP in MongoDB Atlas → Network Access

**Cannot find path ReclaimIt\ReclaimIt**
- You're already in the project folder. Don't `cd ReclaimIt` again.
