const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;
let devProcesses = [];

const isDev = !app.isPackaged;
const BACKEND_PORT = 5000;

// פונקציית לוגים לדיבוג ב-Production
const logPath = path.join(app.getPath('userData'), 'server.log');

function logToFile(message) {
    try {
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `${timestamp} - ${message}\n`);
    } catch (error) {
        // Fallback or ignore logging error to prevent app crash
        console.error('Log failure:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // וודא שקיים קובץ כזה
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        // ב-Production, הקבצים נמצאים בתוך תיקיית ה-Resources
        const indexPath = path.join(__dirname, '..', 'frontend', 'build', 'index.html');
        mainWindow.loadFile(indexPath).catch(err => logToFile(`Load Error: ${err.message}`));
    }
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
    logToFile('--- App Launch ---');
    startBackend();
    setTimeout(createWindow, 1000); // השהיה קטנה לביטחון
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
