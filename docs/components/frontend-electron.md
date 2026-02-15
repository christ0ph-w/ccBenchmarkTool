# Frontend: Electron + React

## Overview

Desktop application for file management, benchmark configuration, and results visualization.

## Structure

```
frontend-electron/
├── electron/
│   ├── main.ts            # Electron main process
│   └── preload.ts         # IPC bridge
├── src/
│   ├── components/
│   │   ├── benchmark/     # Results display
│   │   ├── settings/      # Algorithm configuration
│   │   └── ui/            # Shadcn components
│   ├── services/
│   │   ├── benchmarkingService.ts
│   │   └── clusteringService.ts
│   ├── stores/            # Zustand state
│   ├── types/
│   │   └── benchmarkTypes.ts
│   └── views/
├── package.json
└── vite.config.ts
```

## Key Files

### benchmarkingService.ts
HTTP client for Spring Boot API.

### benchmarkTypes.ts
TypeScript interfaces matching backend DTOs. All use camelCase.

### stores/
Zustand stores for global state (files, settings, console).

## Running

```bash
cd frontend-electron
npm install
npm run dev
```

## Building

```bash
npm run build
```

Creates executable in `release/` directory.