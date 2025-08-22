const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initialize } = require('@electron/remote/main');
const { AchievementScanner } = require('./scanner');
const { LinuxNotification } = require('./notification');
const fs = require('fs').promises;

// Initialize remote module
initialize();

// Global instances
let mainWindow;
let notifier;
let scanner;
let settings;

// Load settings
async function loadSettings() {
    try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.json');
        
        try {
            const data = await fs.readFile(settingsPath, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            // Use default settings if file doesn't exist or is invalid
            settings = {
                general: {
                    notifications: true,
                    scanOnStartup: true,
                    refreshInterval: 15
                },
                paths: {
                    steam: path.join(app.getPath('home'), '.steam/steam'),
                    heroic: path.join(app.getPath('home'), '.config/heroic'),
                    additionalPaths: []
                },
                api: {
                    steamApiKey: '',
                    steamUserId: '',
                    useSteamCmd: false,
                    steamCmdPath: '/usr/games/steamcmd'
                },
                notifications: {
                    achievementUnlock: true,
                    progressUpdate: true,
                    sessionSummary: true,
                    sound: 'default'
                },
                advanced: {
                    debugMode: false,
                    cacheData: true,
                    cachePath: path.join(app.getPath('cache'), 'achievement-watcher'),
                    logLevel: 'info'
                }
            };
            
            // Save default settings
            await saveSettings(settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        app.quit();
    }
}

// Save settings
async function saveSettings(newSettings) {
    try {
        const userDataPath = app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.json');
        await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
        settings = newSettings;
        
        // Reinitialize components with new settings
        scanner = new AchievementScanner(settings);
        notifier.updateSettings(settings.notifications);
        
        // Update auto-refresh if interval changed
        setupAutoRefresh();
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Setup auto-refresh
let refreshInterval;
function setupAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (settings.general.refreshInterval > 0) {
        refreshInterval = setInterval(async () => {
            try {
                const achievements = await scanner.scanAllAchievements();
                mainWindow.webContents.send('achievements-updated', achievements);
            } catch (error) {
                console.error('Auto-refresh scan failed:', error);
            }
        }, settings.general.refreshInterval * 60 * 1000);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));

    if (settings.advanced.debugMode) {
        mainWindow.webContents.openDevTools();
    }
}

// Initialize app
async function appInitialize() {
    await loadSettings();
    notifier = new LinuxNotification(settings.notifications);
    scanner = new AchievementScanner(settings);
}

// App lifecycle
app.whenReady().then(async () => {
    await appInitialize();
    createWindow();
    setupAutoRefresh();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('scan-achievements', async (event, scanSettings) => {
    try {
        const achievements = await scanner.scanAllAchievements();
        return { success: true, data: achievements };
    } catch (error) {
        console.error('Error scanning achievements:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('show-file-dialog', async (event, options) => {
    return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.on('settings-updated', async (event, newSettings) => {
    await saveSettings(newSettings);
});

ipcMain.on('achievement-unlocked', (event, achievement) => {
    if (settings.notifications.achievementUnlock) {
        notifier.send({
            title: `Achievement Unlocked - ${achievement.game}`,
            description: achievement.name,
            icon: achievement.icon
        });
    }
});

ipcMain.on('progress-update', (event, progress) => {
    if (settings.notifications.progressUpdate) {
        notifier.showProgress(progress);
    }
});

ipcMain.on('session-summary', (event, summary) => {
    if (settings.notifications.sessionSummary) {
        notifier.showComparison(summary.achievements);
    }
});

// Debug logging
if (process.env.NODE_ENV === 'development' || settings?.advanced?.debugMode) {
    ipcMain.on('log', (event, { level, message }) => {
        const logLevels = ['error', 'warn', 'info', 'debug'];
        const settingLevel = settings?.advanced?.logLevel || 'info';
        
        if (logLevels.indexOf(level) <= logLevels.indexOf(settingLevel)) {
            console[level](message);
        }
    });
}

// Export paths for other modules
module.exports.paths = {
    userData: app.getPath('userData'),
    home: app.getPath('home'),
    cache: app.getPath('cache')
};
