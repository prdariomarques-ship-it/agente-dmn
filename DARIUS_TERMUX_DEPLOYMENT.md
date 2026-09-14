# DARIUS OSS — TERMUX DEPLOYMENT ARCHITECTURE

The target production topology limits the mobile app client side to interface rendering. The heavy lifting is delegated entirely to the Node.js backend executing within the Termux sandbox on the same physical Android device.

## System Topology
```text
[ Android UI (APK) ]
       │
     (HTTP)
       ↓
[ Termux Server (Port 3000) ]
       │
  (DARIUS API)
       ↓
[ DARIUS Core ]
       │
[ Model Provider (Ollama) ]
```

## Security & Connectivity
* **API Host:** `0.0.0.0` (Allows Termux to bind the interface so the APK can reach it via `127.0.0.1` locally or via the device's LAN IP).
* **Port:** `3000`
* **Authentication:** Currently limited to localhost. A formal API token verification middleware must be injected before deploying the backend to an open LAN.
* **CORS Requirement:** Ensure the Express server natively permits the `origin` matching the Web UI URL or the APK's localhost bridge.

## Deployment Commands
Within the Termux session, execute the following commands after pulling down the repository source:

```bash
# 1. Update Termux base
pkg update && pkg upgrade

# 2. Ensure Node.js is available
pkg install nodejs

# 3. Enter project and install dependencies
cd darius-oss
npm install

# 4. Bind explicitly for API accessibility
export DARIUS_HOST=0.0.0.0
export DARIUS_PORT=3000

# 5. Start server
npm run server
```
