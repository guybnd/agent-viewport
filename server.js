
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import robot from '@hurdlegroup/robotjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { loadConfig, getConfigPath } from './src/config.js';
import { AgentViewportMCPServer } from './src/mcp.js';
import { TrayManager } from './src/tray.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgentViewportServer {
    constructor() {
        this.config = loadConfig();
        // Inject config path for tray to use
        this.config.configPath = getConfigPath();

        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new Server(this.httpServer);

        this.mcpServer = new AgentViewportMCPServer(this.config);
        this.trayManager = new TrayManager(this.config, () => this.stop());

        this.isStreaming = false;
        this.screenWidth = 0;
        this.screenHeight = 0;

        this.setupExpress();
        this.setupSocketIO();
        this.updateScreenMetrics();
    }

    setupExpress() {
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    updateScreenMetrics() {
        try {
            const size = robot.getScreenSize();
            this.screenWidth = size.width;
            this.screenHeight = size.height;
            console.error(`Detected Screen Size: ${this.screenWidth}x${this.screenHeight}`);
        } catch (e) {
            console.error("Failed to get screen size via RobotJS:", e);
        }
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.error('Client connected');

            if (!this.isStreaming) {
                this.isStreaming = true;
                this.streamLoop();
            }

            socket.on('disconnect', () => {
                console.error('Client disconnected');
                if (this.io.engine.clientsCount === 0) {
                    this.isStreaming = false;
                }
            });

            socket.on('input', (data) => this.handleInput(data));
        });
    }

    handleInput(data) {
        try {
            const { type, x, y, dx, dy, button, key } = data;
            const sex = x !== undefined ? Math.round(x * this.screenWidth) : 0;
            const sey = y !== undefined ? Math.round(y * this.screenHeight) : 0;

            switch (type) {
                case 'mousemove_relative':
                    const mouse = robot.getMousePos();
                    robot.moveMouse(mouse.x + dx, mouse.y + dy);
                    break;
                case 'click_teleport':
                    robot.moveMouse(sex, sey);
                    setTimeout(() => {
                        robot.mouseToggle('down', button || 'left');
                        setTimeout(() => {
                            robot.mouseToggle('up', button || 'left');
                        }, 50);
                    }, 50);
                    break;
                case 'mousedown':
                    robot.mouseToggle('down', button || 'left');
                    break;
                case 'mouseup':
                    robot.mouseToggle('up', button || 'left');
                    break;
                case 'keytap':
                    if (key) robot.keyTap(key);
                    break;
            }
        } catch (err) {
            console.error("Input error:", err);
        }
    }

    async streamLoop() {
        if (!this.isStreaming) return;

        try {
            const start = Date.now();
            const imgBuffer = await screenshot({ format: 'jpg' });

            const processedBuffer = await sharp(imgBuffer)
                .resize({ width: this.config.targetWidth })
                .jpeg({ quality: this.config.jpegQuality })
                .toBuffer();

            this.io.emit('frame', processedBuffer.toString('base64'));

            const duration = Date.now() - start;
            const delay = Math.max(0, (1000 / this.config.fps) - duration);
            if (this.isStreaming) setTimeout(() => this.streamLoop(), delay);
        } catch (err) {
            console.error("Stream error:", err);
            if (this.isStreaming) setTimeout(() => this.streamLoop(), 1000);
        }
    }

    async start() {
        // Start MCP Server (Stdio)
        await this.mcpServer.start();

        // Start HTTP Server
        this.httpServer.listen(this.config.port, () => {
            console.error(`ViewPort Server running at http://localhost:${this.config.port}`);
        });

        // Start Tray
        this.trayManager.start();
    }

    stop() {
        console.error("Shutting down...");
        this.isStreaming = false;
        this.httpServer.close();
        process.exit(0);
    }
}

const server = new AgentViewportServer();
server.start().catch(console.error);
