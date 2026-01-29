
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Helpers for packaged environment
const req = (name) => {
    if (process.pkg) return eval('require')(name);
    return require(name);
};

const SysTray = req('systray2').default;

// Native open URL function (replaces ESM-only 'open' package)
function openUrl(url) {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
}

class TrayManager {
    constructor(config, onExit, uiohook_mod) {
        this.config = config;
        this.onExit = onExit;
        this.uiohook = uiohook_mod.uIOhook;
        this.UiohookKey = uiohook_mod.UiohookKey;
        this.tray = null;
    }

    start() {
        const itemLaunch = {
            title: 'Launch Viewport',
            tooltip: 'Open the viewer in browser',
            checked: false,
            enabled: true
        };

        const itemConfig = {
            title: 'Copy Config Path',
            tooltip: 'Copy path to clipboard',
            checked: false,
            enabled: true
        };

        const itemExit = {
            title: 'Exit',
            tooltip: 'Close AgentViewport',
            checked: false,
            enabled: true
        };

        let iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // Default Red Dot
        try {
            const iconPath = path.join(path.dirname(process.execPath), 'icon.png');
            if (fs.existsSync(iconPath)) {
                iconBase64 = fs.readFileSync(iconPath).toString('base64');
            } else {
                const fallbackPath = path.join(process.cwd(), 'icon.png');
                if (fs.existsSync(fallbackPath)) {
                    iconBase64 = fs.readFileSync(fallbackPath).toString('base64');
                }
            }
        } catch (e) {
            console.error("Failed to load icon.png, using default.", e);
        }

        this.tray = new SysTray({
            menu: {
                icon: iconBase64,
                title: "AgentViewport",
                tooltip: "AgentViewport",
                items: [itemLaunch, itemConfig, itemExit]
            },
            debug: false,
            copyDir: true
        });

        this.tray.onClick(action => {
            if (action.item.title === 'Launch Viewport') {
                openUrl(`http://localhost:${this.config.port}`);
            } else if (action.item.title === 'Copy Config Path') {
                const cp = req('child_process');
                cp.spawn('clip').stdin.end(this.config.configPath);
            } else if (action.item.title === 'Exit') {
                this.shutdown();
            }
        });

        this.setupSafetyHotkey();
    }

    setupSafetyHotkey() {
        this.uiohook.on('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.keycode === this.UiohookKey.S) {
                console.error("SAFETY KILL SWITCH ACTIVATED");
                this.shutdown();
            }
        });
        console.log("Safety Mode Hotkey (Ctrl+Alt+S) disabled temporarily due to input blocking.");
    }

    shutdown() {
        if (this.tray) this.tray.kill();
        this.uiohook.stop();
        if (this.onExit) this.onExit();
        process.exit(0);
    }
}

module.exports = { TrayManager };
