const { ipcRenderer } = require('electron');
const path = require('path');

// Cache DOM elements
const gameList = document.getElementById('gameList');
const scanBtn = document.getElementById('scanBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Settings tabs
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsContents = document.querySelectorAll('.settings-content');

// Default settings
const defaultSettings = {
    general: {
        notifications: true,
        scanOnStartup: true,
        refreshInterval: 15
    },
    paths: {
        steam: process.env.HOME + '/.steam/steam',
        heroic: process.env.HOME + '/.config/heroic',
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
        cachePath: process.env.HOME + '/.cache/achievement-watcher',
        logLevel: 'info'
    }
};

// Load settings
let settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;

// Initialize settings UI
function initSettings() {
    // General settings
    document.getElementById('notificationToggle').checked = settings.general.notifications;
    document.getElementById('scanStartupToggle').checked = settings.general.scanOnStartup;
    document.getElementById('refreshInterval').value = settings.general.refreshInterval;

    // Paths
    document.getElementById('steamPath').value = settings.paths.steam;
    document.getElementById('heroicPath').value = settings.paths.heroic;
    updateAdditionalPaths();

    // API settings
    document.getElementById('steamApiKey').value = settings.api.steamApiKey;
    document.getElementById('steamUserId').value = settings.api.steamUserId;
    document.getElementById('useSteamCmd').checked = settings.api.useSteamCmd;
    document.getElementById('steamCmdPath').value = settings.api.steamCmdPath;

    // Notification settings
    document.getElementById('achievementNotify').checked = settings.notifications.achievementUnlock;
    document.getElementById('progressNotify').checked = settings.notifications.progressUpdate;
    document.getElementById('summaryNotify').checked = settings.notifications.sessionSummary;
    document.getElementById('notificationSound').value = settings.notifications.sound;

    // Advanced settings
    document.getElementById('debugMode').checked = settings.advanced.debugMode;
    document.getElementById('cacheData').checked = settings.advanced.cacheData;
    document.getElementById('cachePath').value = settings.advanced.cachePath;
    document.getElementById('logLevel').value = settings.advanced.logLevel;
}

// Update additional paths UI
function updateAdditionalPaths() {
    const container = document.getElementById('additionalPaths');
    container.innerHTML = '';

    settings.paths.additionalPaths.forEach((path, index) => {
        const div = document.createElement('div');
        div.className = 'flex gap-2';
        div.innerHTML = `
            <input type="text" value="${path}" class="flex-1 bg-gray-700 rounded p-2" readonly>
            <button class="bg-red-600 px-4 py-2 rounded hover:bg-red-700" onclick="removePath(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// Save settings
function saveSettings() {
    settings = {
        general: {
            notifications: document.getElementById('notificationToggle').checked,
            scanOnStartup: document.getElementById('scanStartupToggle').checked,
            refreshInterval: parseInt(document.getElementById('refreshInterval').value)
        },
        paths: {
            steam: document.getElementById('steamPath').value,
            heroic: document.getElementById('heroicPath').value,
            additionalPaths: settings.paths.additionalPaths
        },
        api: {
            steamApiKey: document.getElementById('steamApiKey').value,
            steamUserId: document.getElementById('steamUserId').value,
            useSteamCmd: document.getElementById('useSteamCmd').checked,
            steamCmdPath: document.getElementById('steamCmdPath').value
        },
        notifications: {
            achievementUnlock: document.getElementById('achievementNotify').checked,
            progressUpdate: document.getElementById('progressNotify').checked,
            sessionSummary: document.getElementById('summaryNotify').checked,
            sound: document.getElementById('notificationSound').value
        },
        advanced: {
            debugMode: document.getElementById('debugMode').checked,
            cacheData: document.getElementById('cacheData').checked,
            cachePath: document.getElementById('cachePath').value,
            logLevel: document.getElementById('logLevel').value
        }
    };

    localStorage.setItem('settings', JSON.stringify(settings));
    ipcRenderer.send('settings-updated', settings);
}

// Create game card HTML
function createGameCard(game) {
    const unlockedCount = game.achievements.filter(a => a.unlocked).length;
    const totalCount = game.achievements.length;
    const percentage = Math.round((unlockedCount / totalCount) * 100);

    return `
        <div class="achievement-card bg-[#1b2838] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div class="relative">
                <img src="${game.headerImage || 'default-header.jpg'}" 
                     alt="${game.name}" 
                     class="w-full h-40 object-cover">
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                    <h3 class="text-white font-bold truncate">${game.name}</h3>
                </div>
            </div>
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[#66c0f4]">${unlockedCount}/${totalCount} Achievements</span>
                    <span class="text-[#66c0f4]">${percentage}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-[#66c0f4] h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2">
                    ${game.achievements.map(achievement => `
                        <div class="achievement ${achievement.unlocked ? 'unlocked' : ''} rounded p-2 flex items-center gap-2">
                            <img src="${achievement.icon || 'default-achievement.png'}" 
                                 alt="${achievement.name}"
                                 class="w-8 h-8 ${!achievement.unlocked ? 'opacity-50' : ''}">
                            <div class="flex-1 min-w-0">
                                <p class="font-medium truncate">${achievement.name}</p>
                                <p class="text-sm text-gray-400 truncate">${achievement.description || ''}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Scan for achievements
async function scanAchievements() {
    try {
        loadingOverlay.classList.remove('hidden');
        const result = await ipcRenderer.invoke('scan-achievements', settings);
        
        if (result.success) {
            gameList.innerHTML = '';
            result.data.forEach(game => {
                const gameElement = document.createElement('div');
                gameElement.innerHTML = createGameCard(game);
                gameList.appendChild(gameElement);
            });
        } else {
            console.error('Scan failed:', result.error);
            if (settings.general.notifications) {
                ipcRenderer.send('show-notification', {
                    title: 'Scan Failed',
                    body: result.error
                });
            }
        }
    } catch (error) {
        console.error('Error during scan:', error);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Settings tabs functionality
settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        settingsTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding content
        settingsContents.forEach(content => {
            if (content.dataset.tab === tabName) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    });
});

// Event Listeners
scanBtn.addEventListener('click', scanAchievements);

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    settingsModal.classList.add('hidden');
    // Trigger a rescan if paths were changed
    scanAchievements();
});

// File browser functionality
document.querySelectorAll('button:contains("Browse")').forEach(button => {
    button.addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('show-file-dialog', {
            properties: ['openDirectory']
        });
        
        if (!result.canceled) {
            const input = button.previousElementSibling;
            input.value = result.filePaths[0];
        }
    });
});

// Add path functionality
document.querySelector('button:contains("Add Path")').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('show-file-dialog', {
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        settings.paths.additionalPaths.push(result.filePaths[0]);
        updateAdditionalPaths();
    }
});

// Remove path functionality
window.removePath = (index) => {
    settings.paths.additionalPaths.splice(index, 1);
    updateAdditionalPaths();
};

// Auto-refresh functionality
let refreshInterval;

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (settings.general.refreshInterval > 0) {
        refreshInterval = setInterval(scanAchievements, settings.general.refreshInterval * 60 * 1000);
    }
}

// Achievement unlock listener
ipcRenderer.on('achievement-unlocked', (event, achievement) => {
    if (settings.notifications.achievementUnlock) {
        // Update UI to reflect the new achievement
        const achievementElement = document.querySelector(`[data-achievement-id="${achievement.id}"]`);
        if (achievementElement) {
            achievementElement.classList.add('unlocked');
        }
    }
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    if (settings.general.scanOnStartup) {
        scanAchievements();
    }
    startAutoRefresh();
});

// Steam Deck gamepad navigation support
let currentFocus = null;

function handleGamepadInput(event) {
    const focusableElements = Array.from(document.querySelectorAll('button, [role="button"], .achievement'));
    
    if (!currentFocus) {
        currentFocus = focusableElements[0];
        currentFocus.focus();
        return;
    }

    const currentIndex = focusableElements.indexOf(currentFocus);
    let nextIndex;

    switch(event.code) {
        case 'ArrowRight':
            nextIndex = Math.min(currentIndex + 1, focusableElements.length - 1);
            break;
        case 'ArrowLeft':
            nextIndex = Math.max(currentIndex - 1, 0);
            break;
        case 'ArrowDown':
            nextIndex = Math.min(currentIndex + 3, focusableElements.length - 1);
            break;
        case 'ArrowUp':
            nextIndex = Math.max(currentIndex - 3, 0);
            break;
    }

    if (nextIndex !== undefined) {
        currentFocus = focusableElements[nextIndex];
        currentFocus.focus();
    }
}

document.addEventListener('keydown', handleGamepadInput);
