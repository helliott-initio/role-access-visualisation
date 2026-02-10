import { useState, useCallback, useRef, useEffect } from 'react';
import type { RoleMap } from '../types';

const FILE_PICKER_TYPES = [
  {
    description: 'Role Map JSON',
    accept: { 'application/json': ['.json'] as string[] },
  },
];

const LAST_FILE_KEY = 'role-map-last-file';

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
  const isInitialLoadRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
      isInitialLoadRef.current = true;
      setFileName(handle.name);
      setLastFileName(handle.name);
      localStorage.setItem(LAST_FILE_KEY, handle.name);
      setSaveError(null);
      return mapsArr as RoleMap[];
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      console.error('Failed to open file:', err);
      setSaveError(String(err));
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
      setSaveError(null);

      await writeToHandle(handle, currentMaps);
      return true;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      console.error('Failed to create file:', err);
      setSaveError(String(err));
      return false;
    }
  }, []);

  const closeFile = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    fileHandleRef.current = null;
    setFileName(null);
    setLastFileName(null);
    localStorage.removeItem(LAST_FILE_KEY);
    setSaveError(null);
    setIsSaving(false);
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!fileHandleRef.current) return;

    // Skip the first cycle after openFile to avoid writing back what we just read
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const handle = fileHandleRef.current;
      if (!handle) return;

      setIsSaving(true);
      try {
        await writeToHandle(handle, maps);
        setSaveError(null);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveError(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Permission denied. Re-open the file to continue saving.'
            : `Save failed: ${String(err)}`
        );
        fileHandleRef.current = null;
        setFileName(null);
      } finally {
        setIsSaving(false);
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
    isSaving,
    saveError,
    isSupported,
    openFile,
    newFile,
    closeFile,
  };
}
