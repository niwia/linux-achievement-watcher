const { spawn } = require('child_process');
const path = require('path');

class LinuxNotification {
    constructor() {
        // Check if running on Steam Deck
        this.isSteamDeck = process.env.STEAM_DECK === '1';
        
        // Check if notify-send is available
        this.checkNotifySend();
    }

    async checkNotifySend() {
        try {
            await spawn('which', ['notify-send']);
            this.hasNotifySend = true;
        } catch (error) {
            console.warn('notify-send not found. Notifications may not work properly.');
            this.hasNotifySend = false;
        }
    }

    async send(achievement) {
        if (!this.hasNotifySend) {
            console.warn('Notification system not available');
            return;
        }

        const icon = achievement.icon || path.join(__dirname, '../assets/trophy.png');
        const urgency = this.isSteamDeck ? 'low' : 'normal';

        try {
            const notifyProcess = spawn('notify-send', [
                '--app-name=Achievement Watcher',
                `--icon=${icon}`,
                `--urgency=${urgency}`,
                achievement.title || 'Achievement Unlocked',
                achievement.description || '',
                // Steam Deck specific options for better integration
                ...(this.isSteamDeck ? [
                    '--hint=int:transient:1',
                    '--hint=string:desktop-entry:achievement-watcher'
                ] : [])
            ]);

            return new Promise((resolve, reject) => {
                notifyProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Notification failed with code ${code}`));
                    }
                });

                notifyProcess.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
            throw error;
        }
    }

    // Method to show achievement progress
    async showProgress(achievement) {
        if (!achievement.progress) return;

        try {
            await this.send({
                title: `Achievement Progress - ${achievement.game}`,
                description: `${achievement.name}: ${achievement.progress.current}/${achievement.progress.max}`,
                icon: achievement.icon
            });
        } catch (error) {
            console.error('Failed to send progress notification:', error);
        }
    }

    // Method to show achievement comparison
    async showComparison(achievements) {
        const total = achievements.length;
        const unlocked = achievements.filter(a => a.unlocked).length;
        const percentage = Math.round((unlocked / total) * 100);

        try {
            await this.send({
                title: 'Achievement Progress',
                description: `${unlocked}/${total} (${percentage}%) Achievements Unlocked`,
                icon: path.join(__dirname, '../assets/trophy.png')
            });
        } catch (error) {
            console.error('Failed to send comparison notification:', error);
        }
    }

    // Steam Deck specific game overlay notification
    async showGameOverlay(achievement) {
        if (!this.isSteamDeck) return;

        try {
            // Use Steam's overlay notification system if available
            const overlayProcess = spawn('steam-deck-notify', [
                '--title', achievement.title || 'Achievement Unlocked',
                '--message', achievement.description || '',
                '--icon', achievement.icon || path.join(__dirname, '../assets/trophy.png')
            ]);

            return new Promise((resolve, reject) => {
                overlayProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        // Fallback to regular notification if overlay fails
                        this.send(achievement).then(resolve).catch(reject);
                    }
                });
            });
        } catch (error) {
            // Fallback to regular notification
            return this.send(achievement);
        }
    }
}

module.exports = {
    LinuxNotification
};
