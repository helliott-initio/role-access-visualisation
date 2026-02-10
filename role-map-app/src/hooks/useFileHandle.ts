import { useState, useCallback, useRef, useEffect } from 'react';
import type { RoleMap } from '../types';

const FILE_PICKER_TYPES = [
  {
    description: 'Role Map JSON',
    accept: { 'application/json': ['.json'] as string[] },
  },
];

const LAST_FILE_KEY = 'role-map-last-file';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

async function writeToHandle(handle: FileSystemFileHandle, maps: RoleMap[]): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(JSON.stringify(maps, null, 2));
    await writable.close();
  } catch (err) {
    try { await writable.close(); } catch { /* ignore close error */ }
    throw err;
  }
}

export function useFileHandle(maps: RoleMap[]) {
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always keep the latest maps in a ref so the debounced write uses fresh data
  const mapsRef = useRef(maps);
  mapsRef.current = maps;

  // Compact JSON snapshot of what was last saved/loaded — used to detect real changes
  const lastSavedJsonRef = useRef<string>('');

  const [fileName, setFileName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Remember the last file the user was working with
  const [lastFileName, setLastFileName] = useState<string | null>(() => {
    return localStorage.getItem(LAST_FILE_KEY);
  });

  const isSupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  const openFile = useCallback(async (): Promise<RoleMap[] | null> => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: FILE_PICKER_TYPES,
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      const mapsArr = Array.isArray(parsed) ? parsed : [parsed];
      const isValid = mapsArr.every((m: unknown) => {
        if (!m || typeof m !== 'object') return false;
        const map = m as Record<string, unknown>;
        return (
          typeof map.id === 'string' &&
          typeof map.name === 'string' &&
          Array.isArray(map.sections) &&
          Array.isArray(map.groups)
        );
      });
      if (!isValid || mapsArr.length === 0) return null;

      fileHandleRef.current = handle;
      // Snapshot what we just loaded so the effect knows it's already saved
      lastSavedJsonRef.current = JSON.stringify(mapsArr);
      setFileName(handle.name);
      setLastFileName(handle.name);
      localStorage.setItem(LAST_FILE_KEY, handle.name);
      setSaveStatus('saved');
      setSaveError(null);
      return mapsArr as RoleMap[];
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      console.error('Failed to open file:', err);
      setSaveError(String(err));
      setSaveStatus('error');
      return null;
    }
  }, []);

  const newFile = useCallback(async (currentMaps: RoleMap[]): Promise<boolean> => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'role-maps.json',
        types: FILE_PICKER_TYPES,
      });
      fileHandleRef.current = handle;
      setFileName(handle.name);
      setLastFileName(handle.name);
      localStorage.setItem(LAST_FILE_KEY, handle.name);
      setSaveStatus('saving');
      setSaveError(null);

      await writeToHandle(handle, currentMaps);
      lastSavedJsonRef.current = JSON.stringify(currentMaps);
      setSaveStatus('saved');
      return true;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      console.error('Failed to create file:', err);
      setSaveError(String(err));
      setSaveStatus('error');
      return false;
    }
  }, []);

  const closeFile = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    fileHandleRef.current = null;
    lastSavedJsonRef.current = '';
    setFileName(null);
    setLastFileName(null);
    localStorage.removeItem(LAST_FILE_KEY);
    setSaveStatus('idle');
    setSaveError(null);
  }, []);

  // Debounced auto-save: compare against last-saved snapshot to detect real changes
  useEffect(() => {
    if (!fileHandleRef.current) return;

    // Compare current maps with what was last written/loaded
    const currentJson = JSON.stringify(maps);
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    // Data actually changed — mark unsaved and schedule write
    setSaveStatus('unsaved');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const handle = fileHandleRef.current;
      if (!handle) return;

      setSaveStatus('saving');
      try {
        // Use mapsRef.current for the very latest data
        const latestMaps = mapsRef.current;
        await writeToHandle(handle, latestMaps);
        lastSavedJsonRef.current = JSON.stringify(latestMaps);
        setSaveStatus('saved');
        setSaveError(null);
      } catch (err) {
        console.error('Auto-save failed:', err);
        const message = err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permission denied. Re-open the file to continue saving.'
          : `Save failed: ${String(err)}`;
        setSaveError(message);
        setSaveStatus('error');
        fileHandleRef.current = null;
        setFileName(null);
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [maps]);

  // Whether we need the user to re-open their file (had a file last session but no handle now)
  const needsReopen = isSupported && !fileName && !!lastFileName;

  return {
    fileName,
    lastFileName,
    needsReopen,
    saveStatus,
    saveError,
    isSupported,
    openFile,
    newFile,
    closeFile,
  };
}
