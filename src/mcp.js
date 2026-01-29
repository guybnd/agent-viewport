
const path = require('path');
const req = (name) => eval('require')(name);

const { Server } = req("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = req("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = req("@modelcontextprotocol/sdk/types.js");

class AgentViewportMCPServer {
    constructor(serverInstance) {
        this.serverInstance = serverInstance;
        this.mcp = new Server(
            {
                name: "agent-viewport",
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
        this.mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "get_screenshot",
                    description: "Capture a screenshot of the main monitor",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "list_monitors",
                    description: "List available monitors and their dimensions",
                    inputSchema: { type: "object", properties: {} },
                },
                {
                    name: "mouse_click",
                    description: "Click the mouse at specific coordinates",
                    inputSchema: {
                        type: "object",
                        properties: {
                            x: { type: "number", description: "Horizontal coordinate (0 to 1, or absolute pixels)" },
                            y: { type: "number", description: "Vertical coordinate (0 to 1, or absolute pixels)" },
                            button: { type: "string", enum: ["left", "right"], default: "left" },
                        },
                        required: ["x", "y"],
                    },
                },
                {
                    name: "mouse_drag",
                    description: "Drag the mouse to specific coordinates",
                    inputSchema: {
                        type: "object",
                        properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                        },
                        required: ["x", "y"],
                    },
                },
                {
                    name: "key_type",
                    description: "Type text or press a specific key",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: { type: "string", description: "Text to type" },
                            key: { type: "string", description: "Special key to press (e.g., 'enter', 'escape')" },
                        },
                    },
                },
            ],
        }));

        this.mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "get_screenshot": {
                        const base64 = await this.serverInstance.captureScreen();
                        return {
                            content: [{ type: "text", text: `Screenshot captured.` }, { type: "image", data: base64, mimeType: "image/jpeg" }],
                        };
                    }
                    case "list_monitors": {
                        const monitors = await this.serverInstance.getMonitors();
                        return { content: [{ type: "text", text: JSON.stringify(monitors, null, 2) }] };
                    }
                    case "mouse_click": {
                        await this.serverInstance.handleMouseClick(args);
                        return { content: [{ type: "text", text: `Clicked at ${args.x}, ${args.y}` }] };
                    }
                    case "mouse_drag": {
                        await this.serverInstance.handleMouseDrag(args);
                        return { content: [{ type: "text", text: `Dragged to ${args.x}, ${args.y}` }] };
                    }
                    case "key_type": {
                        await this.serverInstance.handleKeyType(args);
                        return { content: [{ type: "text", text: `Input processed: ${args.text || args.key}` }] };
                    }
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true,
                };
            }
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.mcp.connect(transport);
        console.error("MCP Server running on Stdio");
    }
}

module.exports = { AgentViewportMCPServer };
