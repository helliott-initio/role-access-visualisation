import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

interface UndoRedoState<T> {
  past: T[];
  future: T[];
}

/**
 * Generic undo/redo hook that wraps a setState function.
 * Call `pushState` before each mutation to capture the previous state.
 * Call `undo` / `redo` to navigate history.
 */
export function useUndoRedo<T>() {
  const historyRef = useRef<UndoRedoState<T>>({
    past: [],
    future: [],
  });

  // Debounce rapid position changes (drag events) — only capture one snapshot
  // per drag operation, not per frame.
  const batchRef = useRef(false);

  // History lives in a ref so pushes don't re-render on every drag frame, but the
  // *availability* of undo/redo has to be reactive or toolbar buttons keep a stale
  // disabled state. Mirror just the two booleans into state.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncAvailability = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  /**
   * Save current state to history before a mutation.
   * Pass `batch: true` for continuous operations (like dragging)
   * to avoid filling the history with per-frame states.
   */
  const pushState = useCallback((currentState: T, batch = false) => {
    if (batch && batchRef.current) return;
    if (batch) batchRef.current = true;

    const history = historyRef.current;
    const newPast = [...history.past, currentState];
    if (newPast.length > MAX_HISTORY) {
      newPast.shift();
    }
    historyRef.current = {
      past: newPast,
      future: [],
    };
    syncAvailability();
  }, [syncAvailability]);

  /** End a batch operation (call on drag end, etc.) */
  const endBatch = useCallback(() => {
    batchRef.current = false;
  }, []);

  /**
   * Undo: pop from past, push current to future, return the restored state.
   * Returns null if nothing to undo.
   */
  const undo = useCallback((currentState: T): T | null => {
    const history = historyRef.current;
    if (history.past.length === 0) return null;

    const newPast = [...history.past];
    const restored = newPast.pop()!;

    historyRef.current = {
      past: newPast,
      future: [currentState, ...history.future],
    };
    syncAvailability();

    return restored;
  }, [syncAvailability]);

  /**
   * Redo: pop from future, push current to past, return the restored state.
   * Returns null if nothing to redo.
   */
  const redo = useCallback((currentState: T): T | null => {
    const history = historyRef.current;
    if (history.future.length === 0) return null;

    const [restored, ...newFuture] = history.future;

    historyRef.current = {
      past: [...history.past, currentState],
      future: newFuture,
    };
    syncAvailability();

    return restored;
  }, [syncAvailability]);

  /** Clear all history */
  const clearHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] };
    batchRef.current = false;
    syncAvailability();
  }, [syncAvailability]);

  return {
    pushState,
    endBatch,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
