const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork, spawn } = require('child_process');
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
        // בפיתוח, מריצים את שני השרתים
        const backendDir = path.join(__dirname, '..', 'backend');
        const frontendDir = path.join(__dirname, '..', 'frontend');

        // Start backend
        const backendProc = spawn('npm', ['run', 'dev'], {
            cwd: backendDir,
            shell: true,
            stdio: 'ignore'
        });
        devProcesses.push(backendProc);

        // Start frontend
        const frontendProc = spawn('npm', ['start'], {
            cwd: frontendDir,
            shell: true,
            env: { ...process.env, BROWSER: 'none' },
            stdio: 'ignore'
        });
        devProcesses.push(frontendProc);

        return;
    }

    // נתיב לשרת ה-Node בתוך האפליקציה הארוזה
    const backendScript = path.join(process.resourcesPath, 'backend', 'dist', 'server.js');
    const backendDir = path.join(process.resourcesPath, 'backend');

    if (!fs.existsSync(backendScript)) {
        logToFile(`Backend Missing: ${backendScript}`);
        return;
    }

    try {
        backendProcess = fork(backendScript, [], {
            cwd: backendDir,
            env: {
                ...process.env,
                PORT: BACKEND_PORT,
                NODE_ENV: 'production',
                PYTHON_SCRIPTS_PATH: path.join(process.resourcesPath, 'python_scripts')
            },
            stdio: 'pipe'
        });

        backendProcess.stdout.on('data', (data) => logToFile(`[STDOUT]: ${data}`));
        backendProcess.stderr.on('data', (data) => logToFile(`[STDERR]: ${data}`));
    } catch (e) {
        logToFile(`Spawn Error: ${e.message}`);
    }
}

app.on('ready', () => {
    logToFile('--- App Launch ---');
    startBackend();
    setTimeout(createWindow, 1000); // השהיה קטנה לביטחון
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (backendProcess) backendProcess.kill();
    devProcesses.forEach(proc => {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
            } else {
                proc.kill();
            }
        } catch (e) {
            logToFile(`Kill Error: ${e.message}`);
        }
    });
});