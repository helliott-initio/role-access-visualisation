# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**Not detected** - This is a client-side only application with no external API integrations. No backend API calls or third-party service integrations are present.

## Data Storage

**Databases:**
- None - Not applicable

**File Storage:**
- Local browser storage only
  - Storage mechanism: `localStorage`
  - Storage key: `role-map-data`
  - Client: Browser Web Storage API (no SDK required)
  - Implementation: Located in `src/hooks/useRoleMap.ts` (lines 15-30)
  - Data format: JSON serialized AppState containing RoleMap objects

**Data Persistence:**
- Client-side only via `localStorage`
- No server-side persistence
- Data survives browser refresh but not browser cache clear
- Manual export/import via JSON files supported

**Caching:**
- None - Browser localStorage acts as the only persistence layer

## Authentication & Identity

**Auth Provider:**
- None - No authentication system implemented
- The application stores email addresses in role groups (`src/types/index.ts` line 3) but does not authenticate users
- Email field is for informational purposes only

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Console logging only
- Example: `console.error('Error exporting PDF:', error)` in `src/components/RoleMapCanvas.tsx` (line 876)

## CI/CD & Deployment

**Hosting:**
- Not detected - Infrastructure deployment configuration not present

**CI Pipeline:**
- None - No CI/CD configuration files detected

## Export/Import Capabilities

**Data Export:**
- JSON export: Serializes entire state to downloadable JSON file
  - Implementation: `exportData()` in `src/hooks/useRoleMap.ts` (lines 259-261)
  - Trigger: Toolbar button "Save Data" in `src/App.tsx` (lines 151-160)
  - Filename: `role-maps.json`

**Data Import:**
- JSON import: Loads previously exported JSON files
  - Implementation: `importData()` in `src/hooks/useRoleMap.ts` (lines 263-275)
  - Trigger: Toolbar "Load Data" button in `src/App.tsx` (line 200)
  - Parses JSON and restores full application state

**PDF Export:**
- DOM to PDF conversion
  - Implementation: `exportToPDF()` in `src/components/RoleMapCanvas.tsx` (lines 854-879)
  - Uses: `html2canvas` for DOM rendering + `jsPDF` for PDF generation
  - Trigger: Toolbar "Export as PDF" button
  - Filename: Based on active map name, e.g., `{mapName}-role-map.pdf`

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables

**Secrets location:**
- Not applicable - No API keys or secrets required

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party Integrations Summary

**Complete List of External Libraries:**
1. `@xyflow/react` 12.10.0 - Interactive diagram visualization
2. `@dagrejs/dagre` 1.1.8 - Automatic graph layout
3. `html2canvas` 1.4.1 - DOM to image rendering for PDF
4. `jspdf` 4.0.0 - PDF document generation
5. `uuid` 13.0.0 - Unique ID generation
6. `react` 19.2.0 - UI library
7. `react-dom` 19.2.0 - React rendering

**No external service dependencies** - The application is fully self-contained with no API dependencies.

---

*Integration audit: 2026-01-27*
