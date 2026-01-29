
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'AgentViewport');
const CONFIG_PATH = path.join(CONFIG_DIR, 'vividview.config.json');

const DEFAULTS = {
    port: 3000,
    targetWidth: 2560,
    jpegQuality: 70,
    fps: 10,
    safetyModeHotkey: 'Ctrl+Alt+S'
};

export function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }

        if (!fs.existsSync(CONFIG_PATH)) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2));
            return DEFAULTS;
        }

        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return { ...DEFAULTS, ...JSON.parse(data) };
    } catch (error) {
        console.error("Failed to load config:", error);
        return DEFAULTS;
    }
}

export function getConfigPath() {
    return CONFIG_PATH;
}
