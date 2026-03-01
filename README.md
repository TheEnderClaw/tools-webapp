# tools-webapp

Static modular tools webapp (no backend). New tools are auto-discovered from `src/modules/*/manifest.json`.

## Local dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Docker deploy

```bash
docker compose up -d --build
```

## Add a new tool

Create a folder under `src/modules/<tool-name>/manifest.json`:

```json
{
  "id": "example-tool",
  "name": "Example Tool",
  "icon": "🧪",
  "tags": ["demo"],
  "description": "Short description",
  "path": "#/tools/example-tool",
  "version": "0.1.0"
}
```

The app will pick it up automatically at build time.
