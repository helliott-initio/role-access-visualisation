# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- Not configured - no test framework installed
- `package.json` does not include Jest, Vitest, or other test runners

**Assertion Library:**
- None installed

**Run Commands:**
- No test commands available in `package.json`
- Only development commands available: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`

## Test File Organization

**Location:**
- No test files found in codebase (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
- Tests not co-located with source files

**Naming:**
- Not applicable - no tests present

**Structure:**
- Not applicable - no tests present

## Test Structure

**Suite Organization:**
- Not applicable - testing framework not configured

**Patterns:**
- Not applicable - no test code in codebase

## Mocking

**Framework:**
- No mocking library installed

**Patterns:**
- Not applicable

**What to Mock:**
- Would need to mock React hooks and external libraries if tests were implemented

**What NOT to Mock:**
- Would test real business logic in `useRoleMap()` hook without mocking localStorage directly

## Fixtures and Factories

**Test Data:**
- Starter data exists in `src/data/simpleStarterMap.ts` for demo/testing purposes
- Data includes sample `RoleMap`, `Section`, and `RoleGroup` objects
- Can be reused for manual testing or future automated tests

**Location:**
- Demo data in `src/data/simpleStarterMap.ts`

## Coverage

**Requirements:**
- None enforced; no coverage configuration found

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Would be appropriate for:
  - `useRoleMap()` hook state management and callbacks
  - Utility functions in `src/utils/layout.ts` (getLayoutedElements, groupNodesBySection)
  - Modal form validation logic in `EditModal.tsx`
  - Data transformation and filtering logic

**Integration Tests:**
- Not implemented
- Would be appropriate for:
  - State flow through `useRoleMap()` with multiple operations
  - Canvas rendering with ReactFlow integration
  - Data persistence to localStorage

**E2E Tests:**
- Not implemented
- Would test user workflows like:
  - Creating, editing, deleting role groups
  - Modifying section properties
  - Exporting to PDF
  - Import/export JSON data

## Testing Gaps and Recommendations

**Current State:**
- Zero automated test coverage
- Application relies on manual testing and user interaction testing
- No CI/CD pipeline to validate changes

**High Priority Test Areas:**
1. `useRoleMap()` hook - core state management logic
   - Critical path for all data operations
   - localStorage persistence edge cases
   - Complex state transitions with dependent updates
   - Risk: Silent data corruption or loss

2. Layout utilities (`getLayoutedElements`, `groupNodesBySection`)
   - Algorithmic complexity with graph processing
   - Risk: Incorrect node positioning in canvas

3. Modal form validation and group creation
   - Email validation and formatting
   - ID generation from email
   - Parent-child relationship validation
   - Risk: Invalid data states

**Setup Required:**
```bash
# Install test framework (recommendation: Vitest for React)
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Create vitest config
# Create test directory at src/__tests__/ or co-locate *.test.tsx files

# Add test command to package.json:
"test": "vitest"
"test:ui": "vitest --ui"
"test:coverage": "vitest --coverage"
```

**Example Test Structure (if implemented):**

```typescript
// src/hooks/__tests__/useRoleMap.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRoleMap } from '../useRoleMap';

describe('useRoleMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRoleMap());
    expect(result.current.state.maps.length).toBeGreaterThan(0);
    expect(result.current.state.activeMapId).toBeDefined();
  });

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useRoleMap());
    act(() => {
      result.current.setActiveMap('new-id');
    });
    const stored = JSON.parse(localStorage.getItem('role-map-data') || '{}');
    expect(stored.activeMapId).toBe('new-id');
  });
});
```

**Example Utility Test (if implemented):**

```typescript
// src/utils/__tests__/layout.test.ts
import { getLayoutedElements, groupNodesBySection } from '../layout';
import type { Node, Edge } from '@xyflow/react';

describe('getLayoutedElements', () => {
  it('should layout nodes with proper spacing', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

    const result = getLayoutedElements(nodes, edges);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].position.y).not.toBe(result.nodes[1].position.y);
  });
});
```

## Known Testing Constraints

**Browser APIs:**
- localStorage used for persistence - would need mocking in tests
- html2canvas and jsPDF libraries used for PDF export - would need mocking
- DOM event listeners in components - would need simulation or testing library

**React Flow Integration:**
- ReactFlow components complex to test in isolation
- Would require testing library with ReactFlow support or E2E testing approach

---

*Testing analysis: 2026-01-27*
