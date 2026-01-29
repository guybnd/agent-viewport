
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'AgentViewport');
const CONFIG_PATH = path.join(CONFIG_DIR, 'agent-viewport.config.json');

const DEFAULTS = {
    port: 3000,
    targetWidth: 2560,
    fps: 10,
    jpegQuality: 70,
    safetyModeHotkey: 'Ctrl+Alt+S'
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    let config = { ...DEFAULTS };
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config = { ...config, ...data };
        } catch (e) {
            console.error('Error loading config, using defaults:', e);
        }
    } else {
        saveConfig(config);
    }

    config.configPath = CONFIG_PATH;
    return config;
}

function saveConfig(config) {
    try {
        const { configPath, ...data } = config;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error('Error saving config:', e);
    }
}

module.exports = { loadConfig, saveConfig };
