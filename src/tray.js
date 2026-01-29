
import SysTray from 'systray2';
import open from 'open';
import { uIOhook, UiohookKey } from 'uiohook-napi';

export class TrayManager {
    constructor(config, onExit) {
        this.config = config;
        this.onExit = onExit;
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

        this.tray = new SysTray.default({
            menu: {
                icon: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Base64 red dot
                title: "AgentViewport",
                tooltip: "AgentViewport",
                items: [itemLaunch, itemConfig, itemExit]
            },
            debug: false,
            copyDir: true
        });

        this.tray.onClick(action => {
            if (action.item.title === 'Launch Viewport') {
                open(`http://localhost:${this.config.port}`);
            } else if (action.item.title === 'Copy Config Path') {
                import('child_process').then(cp => {
                    cp.spawn('clip').stdin.end(this.config.configPath);
                });
            } else if (action.item.title === 'Exit') {
                this.shutdown();
            }
        });

        this.setupSafetyHotkey();
    }

    setupSafetyHotkey() {
        // hardcoded safety mode for now: Ctrl+Alt+S
        // uiohook codes: Ctrl=29, Alt=56, S=31 (Scan codes vary, need to be careful).
        // UiohookKey enums are safer.

        uIOhook.on('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.keycode === UiohookKey.S) {
                console.error("SAFETY KILL SWITCH ACTIVATED");
                this.shutdown();
            }
        });
        // uIOhook.start(); // Temporarily disabled: causing input blocking on some Windows systems
        console.log("Safety Mode Hotkey (Ctrl+Alt+S) disabled temporarily due to input blocking.");
    }

    shutdown() {
        if (this.tray) this.tray.kill();
        uIOhook.stop();
        if (this.onExit) this.onExit();
        process.exit(0);
    }
}
