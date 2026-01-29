
const path = require('path');
const fs = require('fs');

// VERY IMPORTANT: Setup external module paths globally
if (process.pkg) {
    const vendorPath = path.join(path.dirname(process.execPath), 'vendor');
    // Set NODE_PATH and re-init module paths
    process.env.NODE_PATH = vendorPath;
    require('module').Module._initPaths();
}

// eval('require') pattern to ensure pkg doesn't try to bundle these
const req = (name) => eval('require')(name);

const express = req('express');
const { createServer } = req('http');
const { Server } = req('socket.io');
const screenshot = req('screenshot-desktop');
const sharp = req('sharp');
const robot = req('@hurdlegroup/robotjs');
const uiohook_mod = req('uiohook-napi');

const { uIOhook, UiohookKey } = uiohook_mod;

const { loadConfig } = require('./src/config.js');
const { AgentViewportMCPServer } = require('./src/mcp.js');
const { TrayManager } = require('./src/tray.js');

class AgentViewportServer {
    constructor() {
        this.config = loadConfig();
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new Server(this.httpServer);
        this.mcpServer = new AgentViewportMCPServer(this);
        this.trayManager = new TrayManager(this.config, () => this.stop(), uiohook_mod);

        this.setupExpress();
        this.setupSocketIO();
    }

    setupExpress() {
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.error('Viewport client connected');

            socket.on('input', async (data) => {
                await this.handleInput(data);
            });

            const streamLoop = async () => {
                if (socket.connected) {
                    try {
                        const base64 = await this.captureScreen();
                        socket.emit('frame', base64);
                    } catch (e) {
                        console.error("Stream error:", e);
                    }
                    setTimeout(streamLoop, 1000 / this.config.fps);
                }
            };
            streamLoop();
        });
    }

    async captureScreen() {
        const img = await screenshot({ format: 'jpg' });
        const buffer = await sharp(img)
            .resize(this.config.targetWidth)
            .jpeg({ quality: this.config.jpegQuality })
            .toBuffer();
        return buffer.toString('base64');
    }

    async getMonitors() {
        return await screenshot.listDisplays();
    }

    async handleMouseClick({ x, y, button = 'left' }) {
        const { width, height } = robot.getScreenSize();
        const targetX = Math.round(x <= 1 ? x * width : x);
        const targetY = Math.round(y <= 1 ? y * height : y);
        robot.moveMouse(targetX, targetY);
        await new Promise(r => setTimeout(r, 50));
        robot.mouseClick(button);
    }

    async handleMouseDrag({ x, y }) {
        const { width, height } = robot.getScreenSize();
        const targetX = x <= 1 ? x * width : x;
        const targetY = y <= 1 ? y * height : y;
        robot.dragMouse(targetX, targetY);
    }

    async handleKeyType({ text, key }) {
        if (text) {
            robot.typeString(text);
        }
        if (key) {
            robot.keyTap(key);
        }
    }

    async handleInput(data) {
        const { width, height } = robot.getScreenSize();

        if (data.type === 'click' || data.type === 'click_teleport') {
            // Teleport + click
            await this.handleMouseClick(data);
        } else if (data.type === 'move') {
            robot.moveMouse(data.x * width, data.y * height);
        } else if (data.type === 'mousemove_relative') {
            // Relative movement for pointer lock mode
            const pos = robot.getMousePos();
            robot.moveMouse(pos.x + data.dx, pos.y + data.dy);
        } else if (data.type === 'mousedown') {
            robot.mouseToggle('down', data.button || 'left');
        } else if (data.type === 'mouseup') {
            robot.mouseToggle('up', data.button || 'left');
        } else if (data.type === 'keydown' || data.type === 'keytap') {
            await this.handleKeyType({ key: data.key });
        }
    }

    async start() {
        await this.mcpServer.start();
        this.httpServer.listen(this.config.port, () => {
            console.error(`ViewPort Server running at http://localhost:${this.config.port}`);
        });
        this.trayManager.start();
    }

    stop() {
        console.error("Shutting down...");
        this.httpServer.close();
    }
}

const server = new AgentViewportServer();
server.start();
