
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import robot from '@hurdlegroup/robotjs';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

export class AgentViewportMCPServer {
    constructor(config) {
        this.config = config;
        this.server = new Server(
            {
                name: "agent-viewport-mcp",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        this.setupHandlers();
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "get_screenshot",
                        description: "Capture the current screen content. Returns a base64 encoded JPEG image.",
                        inputSchema: {
                            type: "object",
                            properties: {},
                        },
                    },
                    {
                        name: "list_monitors",
                        description: "List available monitors and their dimensions.",
                        inputSchema: {
                            type: "object",
                            properties: {},
                        },
                    },
                    {
                        name: "mouse_click",
                        description: "Click the mouse at a specific location.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                x: { type: "number", description: "X coordinate (pixels or normalized 0-1)" },
                                y: { type: "number", description: "Y coordinate (pixels or normalized 0-1)" },
                                button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
                                normalized: { type: "boolean", description: "If true, x/y are treated as 0-1 percentages of screen size.", default: false }
                            },
                            required: ["x", "y"],
                        },
                    },
                    {
                        name: "mouse_drag",
                        description: "Drag the mouse from current position to a new location.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                x: { type: "number", description: "Target X coordinate" },
                                y: { type: "number", description: "Target Y coordinate" },
                                button: { type: "string", enum: ["left", "right", "middle"], default: "left" },
                                normalized: { type: "boolean", default: false }
                            },
                            required: ["x", "y"],
                        },
                    },
                    {
                        name: "key_type",
                        description: "Type a string or press a specific key.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: { type: "string", description: "String to type" },
                                key: { type: "string", description: "Single key to tap (e.g. 'enter', 'escape')" },
                                modifiers: { type: "array", items: { type: "string" }, description: "Modifiers like 'alt', 'control'" }
                            },
                        },
                    },
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;
                const screenSize = robot.getScreenSize();

                switch (name) {
                    case "get_screenshot": {
                        const imgBuffer = await screenshot({ format: 'jpg' });
                        const processedBuffer = await sharp(imgBuffer)
                            .resize({ width: this.config.targetWidth })
                            .jpeg({ quality: this.config.jpegQuality })
                            .toBuffer();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: processedBuffer.toString('base64'),
                                },
                            ],
                        };
                    }

                    case "list_monitors": {
                        // RobotJS mainly sees the primary screen effectively or combined.
                        // For now we return the main screen size as perceived by RobotJS.
                        return {
                            content: [{ type: "text", text: JSON.stringify(screenSize) }]
                        };
                    }

                    case "mouse_click": {
                        let { x, y, button, normalized } = args;
                        if (normalized) {
                            x = Math.round(x * screenSize.width);
                            y = Math.round(y * screenSize.height);
                        }

                        robot.moveMouse(x, y);
                        // Small delay to ensure move registers
                        await new Promise(r => setTimeout(r, 50));
                        robot.mouseClick(button || "left");

                        return { content: [{ type: "text", text: `Clicked at ${x}, ${y}` }] };
                    }

                    case "mouse_drag": {
                        let { x, y, button, normalized } = args;
                        if (normalized) {
                            x = Math.round(x * screenSize.width);
                            y = Math.round(y * screenSize.height);
                        }

                        robot.mouseToggle("down", button || "left");
                        robot.dragMouse(x, y);
                        robot.mouseToggle("up", button || "left");

                        return { content: [{ type: "text", text: `Dragged to ${x}, ${y}` }] };
                    }

                    case "key_type": {
                        const { text, key, modifiers } = args;
                        if (text) {
                            robot.typeString(text);
                        }
                        if (key) {
                            robot.keyTap(key, modifiers || []);
                        }
                        return { content: [{ type: "text", text: "Typed input" }] };
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                };
            }
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("MCP Server running on Stdio");
    }
}
