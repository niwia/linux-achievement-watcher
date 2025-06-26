const path = require('path');
const glob = require('fast-glob');
const fs = require('fs').promises;
const ini = require('ini');
const normalize = require('normalize-path');
const fetch = require('node-fetch');
const { spawn } = require('child_process');

class AchievementScanner {
    constructor(settings) {
        this.settings = settings;
        this.steamApiCache = new Map();
        this.gameDataCache = new Map();
    }

    // Main scanning function
    async scanAllAchievements() {
        const data = [];
        
        try {
            // Scan Steam achievements
            if (this.settings.paths.steam) {
                await this.scanSteamAchievements(data);
            }
            
            // Scan Heroic games
            if (this.settings.paths.heroic) {
                await this.scanHeroicGames(data);
            }
            
            // Scan additional paths
            if (this.settings.paths.additionalPaths) {
                for (const additionalPath of this.settings.paths.additionalPaths) {
                    await this.scanCustomPath(additionalPath, data);
                }
            }

            // Enrich game data with Steam API information
            if (this.settings.api.steamApiKey) {
                await this.enrichWithSteamData(data);
            }

            // Cache the results if enabled
            if (this.settings.advanced.cacheData) {
                await this.cacheGameData(data);
            }
            
            return data;
        } catch (error) {
            console.error('Error during achievement scan:', error);
            throw error;
        }
    }

    // Steam achievement scanner
    async scanSteamAchievements(data) {
        try {
            const steamPath = this.settings.paths.steam;
            
            // Scan Steam userdata directory for official achievements
            const userdataPath = path.join(steamPath, 'userdata');
            const users = await glob('*', {
                cwd: userdataPath,
                onlyDirectories: true
            });

            for (const user of users) {
                const statsPath = path.join(userdataPath, user, 'stats');
                const statsFiles = await glob('*.bin', { cwd: statsPath });
                
                for (const file of statsFiles) {
                    const appId = file.match(/(\d+)/)[0];
                    const gameData = await this.getSteamGameData(appId);
                    
                    if (gameData) {
                        data.push({
                            appId,
                            name: gameData.name,
                            headerImage: gameData.header_image,
                            source: 'Steam',
                            type: 'official',
                            achievements: await this.parseSteamAchievements(appId, path.join(statsPath, file))
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Error scanning Steam achievements:', error);
        }
    }

    // Heroic Games scanner
    async scanHeroicGames(data) {
        try {
            const heroicPath = this.settings.paths.heroic;
            const configFiles = await glob('**/config.json', {
                cwd: path.join(heroicPath, 'games')
            });

            for (const configFile of configFiles) {
                const configPath = path.join(heroicPath, 'games', configFile);
                const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
                
                if (config.winePrefix) {
                    const prefixPath = path.join(heroicPath, 'prefixes', config.winePrefix);
                    await this.scanPrefixAchievements(prefixPath, data, config);
                }
            }
        } catch (error) {
            console.warn('Error scanning Heroic games:', error);
        }
    }

    // Custom path scanner
    async scanCustomPath(customPath, data) {
        try {
            // Look for common achievement file patterns
            const patterns = [
                '**/achievements.json',
                '**/achievements.ini',
                '**/achieve.dat',
                '**/stats.dat'
            ];

            const files = await glob(patterns, {
                cwd: customPath,
                absolute: true
            });

            for (const file of files) {
                const achievements = await this.parseAchievementFile(file);
                if (achievements && achievements.length > 0) {
                    data.push({
                        name: path.basename(path.dirname(file)),
                        source: 'Custom',
                        type: 'unknown',
                        achievements
                    });
                }
            }
        } catch (error) {
            console.warn(`Error scanning custom path ${customPath}:`, error);
        }
    }

    // Steam API integration
    async getSteamGameData(appId) {
        if (this.steamApiCache.has(appId)) {
            return this.steamApiCache.get(appId);
        }

        try {
            if (this.settings.api.useSteamCmd) {
                return await this.getSteamCmdGameData(appId);
            } else {
                const response = await fetch(
                    `https://store.steampowered.com/api/appdetails?appids=${appId}`
                );
                const data = await response.json();
                
                if (data[appId].success) {
                    this.steamApiCache.set(appId, data[appId].data);
                    return data[appId].data;
                }
            }
        } catch (error) {
            console.warn(`Error fetching Steam data for ${appId}:`, error);
        }
        
        return null;
    }

    // SteamCMD integration
    async getSteamCmdGameData(appId) {
        return new Promise((resolve, reject) => {
            const steamCmd = spawn(this.settings.api.steamCmdPath, [
                '+login', 'anonymous',
                '+app_info_print', appId,
                '+quit'
            ]);

            let output = '';
            
            steamCmd.stdout.on('data', (data) => {
                output += data.toString();
            });

            steamCmd.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Parse SteamCMD output
                        const gameData = this.parseSteamCmdOutput(output, appId);
                        resolve(gameData);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`SteamCMD exited with code ${code}`));
                }
            });
        });
    }

    // Parse achievement files
    async parseAchievementFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const ext = path.extname(filePath).toLowerCase();

            switch (ext) {
                case '.json':
                    return JSON.parse(content);
                case '.ini':
                    return this.parseIniAchievements(content);
                case '.dat':
                    return this.parseDatAchievements(content);
                default:
                    console.warn(`Unsupported achievement file type: ${ext}`);
                    return null;
            }
        } catch (error) {
            console.warn(`Error parsing achievement file ${filePath}:`, error);
            return null;
        }
    }

    // Parse INI format achievements
    parseIniAchievements(content) {
        const data = ini.parse(content);
        const achievements = [];

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value.name) {
                achievements.push({
                    id: key,
                    name: value.name,
                    description: value.description || '',
                    unlocked: value.achieved === '1' || value.unlocked === 'true',
                    icon: value.icon || null,
                    unlock_time: value.unlock_time || null
                });
            }
        }

        return achievements;
    }

    // Parse DAT format achievements
    parseDatAchievements(content) {
        // Implementation depends on the specific DAT format used
        // This is a placeholder for custom DAT parsing logic
        return [];
    }

    // Cache game data
    async cacheGameData(data) {
        if (!this.settings.advanced.cacheData) return;

        try {
            const cacheDir = this.settings.advanced.cachePath;
            await fs.mkdir(cacheDir, { recursive: true });
            
            const cacheFile = path.join(cacheDir, 'game-data.json');
            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('Error caching game data:', error);
        }
    }

    // Load cached game data
    async loadCachedGameData() {
        if (!this.settings.advanced.cacheData) return null;

        try {
            const cacheFile = path.join(this.settings.advanced.cachePath, 'game-data.json');
            const content = await fs.readFile(cacheFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Error loading cached game data:', error);
            return null;
        }
    }

    // Parse SteamCMD output
    parseSteamCmdOutput(output, appId) {
        // Implementation depends on SteamCMD output format
        // This is a placeholder for SteamCMD output parsing logic
        return {
            name: `App ${appId}`,
            header_image: null
        };
    }
}

module.exports = {
    AchievementScanner
};
