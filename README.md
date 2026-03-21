# @zuzjs/logger

> **Trace the flow, mask the noise. Scoped logging for ZuzJS.**

A high-performance, **zero-dependency** logging utility designed for the ZuzJS ecosystem. It provides the power of heavy loggers like Pino or Winston with a featherweight footprint and a focus on developer experience.

## Features
- 🚀 **Scoped Logging:** Create child loggers (e.g., `log.db.info`) with zero boilerplate.
- 🛡️ **Auto-Redaction:** Prevent PII/secrets leak with deep-object masking.
- ⏱️ **Time-Delta Tracking:** See exactly how long operations take (e.g., `+5ms`).
- 🎨 **Senior-Grade Formatting:** Beautifully decomposed Error stacks and color-coded output.
- 🧠 **Type-Safe:** Full Intellisense support for custom tags using TypeScript generics.
- 📄 **File Transport:** Persist logs to local files as plain text or JSON lines.
- 🔌 **WebSocket Transport:** Stream logs to a remote URL with auto-reconnect and buffering.

---

## Quick Start

### 1. Installation
```bash
pnpm add @zuzjs/logger
```

### 2. Basic Setup
Initialize your logger once and export it for your app.

```tsx
import createLogger from "@zuzjs/logger";

const log = createLogger({
    name: "ZuzFlare",
    level: "debug",
    tags: ["boot", "server", "db"], // Pre-define for Intellisense
    redact: ["apiKey", "token"]     // Mask sensitive fields
});

export default log;
```

### 3. Usage
#### Scoped Logging
Instead of passing tags as strings every time, use the scoped property access:

```tsx
log.boot.info("Initializing system...");
log.db.success("Connected to Postgres");
log.server.warn("Port 3000 in use, retrying...");
```

## Transports

### Write Logs to File
```tsx
import { createLogger } from "@zuzjs/logger";

const log = createLogger({
    name: "api",
    level: "info",
    file: {
        path: "./logs/app.log",
        format: "json" // "text" | "json"
    }
});
```

`file` also supports shorthand:
```tsx
file: "./logs/app.log"
```

### Send Logs Over WebSocket
```tsx
import { createLogger } from "@zuzjs/logger";

const log = createLogger({
    name: "api",
    websocket: {
        url: "ws://localhost:3001/logs",
        reconnectIntervalMs: 2000,
        maxQueueSize: 1000
    }
});
```

`websocket` also supports shorthand:
```tsx
websocket: "ws://localhost:3001/logs"
```