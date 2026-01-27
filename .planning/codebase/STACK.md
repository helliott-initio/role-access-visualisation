# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.9.3 - Application code and type definitions
- TSX (React + TypeScript) - React components

**Secondary:**
- JavaScript (ES2022) - Runtime and transpiled output
- CSS - Component and application styling

## Runtime

**Environment:**
- Node.js (version specified in TypeScript target ES2022/ES2023)

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` present (lockfileVersion 3)

## Frameworks

**Core:**
- React 19.2.0 - UI component library and DOM rendering
- React DOM 19.2.0 - React DOM rendering

**Graph Visualization:**
- @xyflow/react 12.10.0 - Interactive node-based diagram editor (replaces React Flow)
- @dagrejs/dagre 1.1.8 - Graph layout engine for automatic hierarchical positioning

**Build/Dev:**
- Vite 7.2.4 - Development server and build tool
- @vitejs/plugin-react 5.1.1 - React JSX support for Vite

**Linting:**
- ESLint 9.39.1 - Code linting
- @eslint/js 9.39.1 - Base ESLint configuration
- typescript-eslint 8.46.4 - TypeScript linting support
- eslint-plugin-react-hooks 7.0.1 - React Hooks linting rules
- eslint-plugin-react-refresh 0.4.24 - React Refresh HMR linting

## Key Dependencies

**Critical:**
- html2canvas 1.4.1 - DOM to canvas rendering for PDF export
- jspdf 4.0.0 - PDF document generation
- uuid 13.0.0 - Unique identifier generation for entities

**Infrastructure:**
- @types/react 19.2.5 - TypeScript type definitions for React
- @types/react-dom 19.2.3 - TypeScript type definitions for React DOM
- @types/node 24.10.1 - TypeScript type definitions for Node APIs
- globals 16.5.0 - ESLint global variables configuration

## Configuration

**Build:**
- `vite.config.ts` - Vite configuration with React plugin
- `tsconfig.json` - Root TypeScript configuration with project references
- `tsconfig.app.json` - Application TypeScript settings (ES2022 target, strict mode)
- `tsconfig.node.json` - Build tool TypeScript settings (ES2023 target)
- `eslint.config.js` - ESLint configuration with flat config format

**Tooling:**
- `.gitignore` - Standard Node/Vite patterns (node_modules, dist, dist-ssr, .local)

## Development Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check with TypeScript then build with Vite
npm run lint       # Run ESLint on all files
npm run preview    # Preview production build locally
```

## Compilation & Type Checking

**TypeScript Strict Mode:**
- Enabled with comprehensive checks
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused function parameters
- `noFallthroughCasesInSwitch: true` - Error on missing switch cases
- `noUncheckedSideEffectImports: true` - Warn on side-effect imports

**Module Resolution:**
- Bundler mode with ESNext module syntax
- Allows importing TypeScript extensions during bundling

## Production Build

- Output: `dist/` directory
- Format: ES modules with tree-shaking support
- Target: Modern browsers with ES2022+ support

---

*Stack analysis: 2026-01-27*
