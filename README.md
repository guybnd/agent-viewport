# AgentViewport

**AgentViewport** is a bridge tool that turns your local desktop into a browser-based viewport and an MCP (Model Context Protocol) Server. It enables AI agents (like Claude Desktop, Cursor, or custom agents) to "see" your screen and interact with it (click, type, drag) via a standardized protocol using their embedded browser tools.

<img src="icon.png" width="200" alt="AgentViewport Icon" />

## Features

- **MCP Server**: Exposes `get_screenshot`, `mouse_click`, `key_type`, and more to AI agents.
- **Low Latency Viewport**: Streams your desktop to `http://localhost:3000` for remote viewing or debugging.
- **System Tray Integration**: Background execution with a convenient tray menu.
- **Safety Mode**: Emergency kill-switch (defaults to Tray Exit).
- **Portable**: Can be built into a standalone `.exe` with bundled dependencies.

## Prerequisites

- **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
- **Windows 10/11** - Currently Windows-only (uses native Windows APIs for screen capture and input simulation)
- **npm** - Comes with Node.js

## Installation

### Option A: Run from Source

1. Clone the repository:

    ```bash
    git clone https://github.com/guybnd/agent-viewport.git
    cd agent-viewport
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Run the application:

    ```bash
    npm start
    ```

### Option B: Build Standalone Executable

1. Install dependencies (if not already done):

    ```bash
    npm install
    ```

2. Build the executable:

    ```bash
    npm run build
    ```

3. Copy runtime dependencies:

    ```bash
    node copy_assets.js
    ```

4. Run from the `dist` folder:

    ```bash
    .\dist\AgentViewport.exe
    ```

> [!IMPORTANT]
> The `dist` folder contains three items that **must stay together**:
>
> - `AgentViewport.exe` - The main executable
> - `vendor/` - Native modules required at runtime
> - `icon.png` - Tray icon
>
> If you move the executable, move the entire `dist` folder contents together.

## Configuration

### Using with Claude Desktop (MCP)

To let Claude "see" your computer, add AgentViewport to your `claude_desktop_config.json`:

**Windows Config Location**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agent-viewport": {
      "command": "node",
      "args": ["C:\\path\\to\\agent-viewport\\server.js"]
    }
  }
}
```

*If using the built .exe:*

```json
{
  "mcpServers": {
    "agent-viewport": {
      "command": "C:\\path\\to\\AgentViewport.exe",
      "args": []
    }
  }
}
```

### Application Config

A configuration file is automatically created at `%AppData%\AgentViewport\agent-viewport.config.json`.
You can modify:

- `port`: Web server port (Default: 3000)
- `targetWidth`: Screenshot resizing width (Default: 2560)
- `fps`: Streaming FPS (Default: 10)
- `jpegQuality`: Compression quality (Default: 70)

## Tools Available to Agents

| Tool Name | Description | Arguments |
| :--- | :--- | :--- |
| `get_screenshot` | Returns a base64 encoded JPEG of the main screen. | None |
| `list_monitors` | Returns screen resolution. | None |
| `mouse_click` | Click at x, y. | `x`, `y`, `button` (left/right) |
| `mouse_drag` | Drag from current pos to x, y. | `x`, `y` |
| `key_type` | Type text or press keys. | `text`, `key` |

## Security & Privacy

> [!CAUTION]
> **Use with Caution**: Giving an AI agent access to your screen and input controls (mouse/keyboard) is a high-privilege action. Always monitor the agent's activity in real-time. Do not leave the agent unattended while it has control over your session.

- **Local Execution**: The server binds to `localhost:3000` by default. It is not accessible from the internet unless you explicitly use a tunnel or port forwarding.
- **MCP Security**: The MCP server communicates via `stdio` (Standard Input/Output), which is a local-only transport managed by your AI client (e.g., Claude Desktop).
- **No Cloud Processing**: Screenshots and input data are processed entirely on your machine. No data is sent to external servers by this tool.
- **Transparency**: This project is open-source. You can inspect `server.js` to see exactly how screenshots are captured and how mouse/keyboard inputs are handled.

## Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **Port 3000 in use** | Change `port` in `%AppData%\AgentViewport\agent-viewport.config.json` or close the conflicting app |
| **Clicks not registering** | Make sure you're clicking inside the video area, not the letterboxed margins |
| **Build fails with EPERM** | Close the running AgentViewport.exe (via tray or Task Manager) before rebuilding |
| **Native module errors** | Delete `node_modules` and `dist`, then run `npm install` and rebuild |
| **Tray icon not appearing** | Check the system tray overflow area (^ arrow in taskbar) |

## Acknowledgements

This project is made possible by these incredible open-source libraries:

- [RobotJS](https://github.com/octalmage/robotjs) - Desktop automation.
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) - MCP server framework.
- [Sharp](https://github.com/lovell/sharp) - High-performance image processing.
- [screenshot-desktop](https://github.com/simon024/screenshot-desktop) - Cross-platform screenshots.
- [Socket.io](https://socket.io/) - Real-time viewport streaming.
- [SysTray2](https://github.com/mrazardar/systray2) - System tray integration.

## License

MIT
