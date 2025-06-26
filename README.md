# Achievement Watcher for Linux/Steam Deck

A modern achievement tracker for Steam, Heroic, and non-Steam games running on Linux/Steam Deck. Track achievements from games running through Proton, including non-Steam games and various achievement systems.

## Features

- **Multi-Source Achievement Tracking**
  - Steam games (official)
  - Games running through Proton
  - Heroic Games Launcher games
  - Non-Steam games with various achievement systems (CODEX, Goldberg, etc.)
  - Custom Proton prefixes

- **Steam Deck Optimized**
  - Touch-friendly interface
  - Gamepad navigation support
  - Optimized for Steam Deck's display
  - Integration with Steam Deck's notification system

- **Modern Interface**
  - Clean, responsive design
  - Real-time achievement notifications
  - Progress tracking and statistics
  - Achievement comparison
  - Dark theme matching Steam's aesthetic

- **Advanced Features**
  - Automatic achievement scanning
  - Support for multiple Steam accounts
  - Achievement progress tracking
  - Screenshot capture on achievement unlock (optional)

## Installation

### Using AppImage (Recommended for Steam Deck)

1. Download the latest AppImage from the releases page
2. Make it executable:
   ```bash
   chmod +x Achievement.Watcher-*.AppImage
   ```
3. Run it:
   ```bash
   ./Achievement.Watcher-*.AppImage
   ```

### Building from Source

1. Install prerequisites:
   ```bash
   # Debian/Ubuntu
   sudo apt-get install nodejs npm libnotify-bin
   
   # Fedora
   sudo dnf install nodejs npm libnotify
   
   # Arch Linux
   sudo pacman -S nodejs npm libnotify
   ```

2. Clone and build:
   ```bash
   git clone https://github.com/yourusername/linux-achievement-watcher.git
   cd linux-achievement-watcher
   chmod +x build/build.sh
   ./build/build.sh
   ```

## Usage

### First Time Setup

1. Launch Achievement Watcher
2. The app will automatically scan for games in default locations
3. Click "Settings" to configure:
   - Notification preferences
   - Auto-scan options
   - Non-Steam game inclusion
   - Screenshot capture settings

### Adding Non-Steam Games

1. Go to Settings
2. Enable "Include Non-Steam Games"
3. Click "Scan Games" to detect achievements from:
   - Custom Proton prefixes
   - Heroic Games Launcher
   - Other game directories

### Steam Deck Integration

- Works out of the box on Steam Deck
- Can be added to Steam as a non-Steam game for easy access
- Supports gamepad navigation
- Integrates with Steam Deck's notification system

### Keyboard Shortcuts

- `F5`: Refresh achievement scan
- `Esc`: Close modals/menus
- `Arrow Keys`: Navigate interface
- `Enter`: Select/Activate
- `Ctrl+,`: Open settings

## Troubleshooting

### Common Issues

1. **Achievements Not Detected**
   - Verify game paths in Settings
   - Ensure proper Proton prefix permissions
   - Check if achievement files exist in expected locations

2. **Notifications Not Working**
   - Verify libnotify-bin is installed
   - Check notification settings in Steam Deck gaming mode
   - Ensure app has proper permissions

3. **Performance Issues**
   - Disable auto-scan if scanning too many directories
   - Adjust scan frequency in settings
   - Clear achievement cache if needed

### Debug Mode

Run with debug logging:
```bash
DEBUG=1 ./Achievement.Watcher-*.AppImage
```

Logs are stored in:
- `~/.config/achievement-watcher/logs/` (normal installation)
- `~/achievement-watcher-logs/` (AppImage)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start in development mode: `npm start`
4. Make your changes
5. Build and test: `./build/build.sh`
6. Submit a pull request

## License

This project is licensed under the LGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the original [Achievement Watcher](https://github.com/xan105/Achievement-Watcher)
- Steam Deck UI inspiration from Valve's Steam UI
- Community contributors and testers

## Support

- GitHub Issues: Bug reports and feature requests
- Discord: Community support and discussion
- Email: Technical support

---

**Note**: This is an unofficial project and is not affiliated with Valve Corporation or Steam.
