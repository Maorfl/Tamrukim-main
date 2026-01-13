# Desktop Application Guide

## 🚀 Running the Desktop App (Development)

The application has been converted to an Electron-based desktop app.

To start the application in development mode:

```bash
npm run dev
```

This command will:
1.  Start the **Backend Server** (Port 5000)
    *   Connects to your remote MongoDB Atlas.
    *   Logs: `[0] prefix`
2.  Start the **React Frontend** (Port 3000)
    *   Logs: `[1] prefix`
3.  Launch the **Electron Native Window**
    *   This window loads the frontend and wraps the application.

## 📦 Building for Distribution (`.exe`)

To create a standalone executable:

```bash
npm run pack
```

> **⚠️ CRITICAL ERROR: "A required privilege is not held by the client"**
> If you see this error during `npm run pack`, it means Windows is blocking `electron-builder` from creating symbolic links required for the packaging tools.
> **SOLUTION:**
> 1. Close your terminal/VS Code.
> 2. Right-click your terminal app and select **"Run as Administrator"**.
> 3. Run `npm run pack` again.
> 
> *Alternatively, enable "Developer Mode" in Windows Settings.*

The output will be in the `dist/` directory:
*   `dist/win-unpacked/Tamrukim Manager.exe`

## Architecture Created

*   **`electron/`**: Contains the main process code (`main.js`) and preload script.
*   **`package.json`**: Updated with build configuration and scripts.
*   **Hybrid Model**:
    *   **Dev**: Electron loads `http://localhost:3000`
    *   **Prod**: Electron spawns the compiled `backend/dist/server.js` internally and loads the static frontend from `frontend/build/index.html`.

## Troubleshooting

*   **White Screen?** Check the console (View -> Toggle Developer Tools).
*   **Database Error?** Ensure you have internet access; the app connects to the remote Atlas DB.
