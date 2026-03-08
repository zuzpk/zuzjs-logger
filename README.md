# @zuzjs/logger

> **Trace the flow, mask the noise. Scoped logging for ZuzJS.**

A high-performance, **zero-dependency** logging utility designed for the ZuzJS ecosystem. It provides the power of heavy loggers like Pino or Winston with a featherweight footprint and a focus on developer experience.

## Features
- 🚀 **Scoped Logging:** Create child loggers (e.g., `log.db.info`) with zero boilerplate.
- 🛡️ **Auto-Redaction:** Prevent PII/secrets leak with deep-object masking.
- ⏱️ **Time-Delta Tracking:** See exactly how long operations take (e.g., `+5ms`).
- 🎨 **Senior-Grade Formatting:** Beautifully decomposed Error stacks and color-coded output.
- 🧠 **Type-Safe:** Full Intellisense support for custom tags using TypeScript generics.

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