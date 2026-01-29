# AgentViewport

**AgentViewport** is a bridge tool that turns your local desktop into a browser-based viewport and an MCP (Model Context Protocol) Server. It enables AI agents (like Claude Desktop, Cursor, or custom agents) to "see" your screen and interact with it (click, type, drag) via a standardized protocol.

![System Tray](https://placeholder-image-url.com/tray.png)

## Features

- **MCP Server**: Exposes `get_screenshot`, `mouse_click`, `key_type`, and more to AI agents.
- **Low Latency Viewport**: Streams your desktop to `http://localhost:3000` for remote viewing or debugging.
- **System Tray Integration**: Background execution with a convenient tray menu.
- **Safety Mode**: Emergency kill-switch (defaults to Tray Exit).
- **Portable**: Can be built into a single `.exe` file.

## Installation

### Option A: Run from Source

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/agent-viewport.git
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

### Option B: Build Executable

1. Run the build script:

    ```bash
    npm run build
    ```

    This will generate `dist/AgentViewport.exe`.
2. Run `dist/AgentViewport.exe`.

*Note: The first run might require Administrator privileges depending on where you place the executable, as it creates a config file in `%AppData%`.*

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

## License

MIT
