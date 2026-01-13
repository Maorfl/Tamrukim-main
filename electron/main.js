const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

const isDev = !app.isPackaged;
// In dev, we expect backend on 5000 and frontend on 3000 (usually)
// In prod, we'll spawn backend on 5000 (or random) and serve static frontend
const BACKEND_PORT = 5000;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });

    if (isDev) {
        // Development
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Production
        // Adjust logic to point to the React build's index.html
        // We assume the build folder is copied to 'frontend-build' in the resources
        mainWindow.loadFile(path.join(__dirname, '../frontend/build/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    if (isDev) {
        console.log('In Dev mode: assuming backend is running separately or via concurrently.');
        return;
    }

    // In production, the backend is in the 'resources' folder
    const backendDir = path.join(process.resourcesPath, 'backend');
    const backendScript = path.join(backendDir, 'dist', 'server.js');

    console.log('Starting backend from:', backendScript);

    // We use 'fork' to use Electron's internal Node.js runtime to execute the script
    // This avoids needing a separate 'node' executable bundled
    backendProcess = require('child_process').fork(backendScript, [], {
        cwd: backendDir, // Important: so backend can find .env and uploads/ relative to itself
        env: {
            ...process.env,
            PORT: BACKEND_PORT,
            // We can force variables here if needed, or rely on .env loading
            ELECTRON_RUN: 'true'
        }
    });

    backendProcess.on('message', (msg) => {
        console.log('Backend message:', msg);
    });

    backendProcess.on('error', (err) => {
        console.error('Backend failed to start:', err);
    });
}

app.on('ready', () => {
    startBackend();
    // Give backend a moment to start? Or just start window immediately (backend connects async)
    // We could use 'wait-on' logic here too, but simple usually works.
    setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (backendProcess) {
        backendProcess.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
