import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { RoleGroup, Section } from '../types';

interface SearchResult {
  id: string;
  nodeId: string;
  label: string;
  sublabel?: string;
  type: 'section' | 'department' | 'group';
  color: string;
  bgColor: string;
  sectionName?: string;
  position?: { x: number; y: number };
}

interface CommandPaletteProps {
  groups: RoleGroup[];
  sections: Section[];
  onSelect: (nodeId: string, position?: { x: number; y: number }) => void;
  onClose: () => void;
}

export function CommandPalette({
  groups,
  sections,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build searchable items
  const allItems = useMemo((): SearchResult[] => {
    const items: SearchResult[] = [];

    // Sections
    sections.forEach((s) => {
      const isDept = !!s.parentSectionId;
      const parentSection = isDept
        ? sections.find((p) => p.id === s.parentSectionId)
        : undefined;
      items.push({
        id: s.id,
        nodeId: `section-${s.id}`,
        label: s.name,
        sublabel: s.email,
        type: isDept ? 'department' : 'section',
        color: s.color,
        bgColor: s.bgColor,
        sectionName: parentSection?.name,
        position: s.position,
      });
    });

    // Groups
    groups.forEach((g) => {
      const section = sections.find((s) => s.id === g.sectionId);
      items.push({
        id: g.id,
        nodeId: g.id,
        label: g.label,
        sublabel: g.email,
        type: 'group',
        color: section?.color || '#666',
        bgColor: section?.bgColor || '#f5f5f5',
        sectionName: section?.name,
        position: g.position,
      });
    });

    return items;
  }, [groups, sections]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        item.sectionName?.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length, query]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.children[activeIndex] as HTMLElement;
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      onSelect(item.nodeId, item.position);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % Math.max(results.length, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev <= 0 ? Math.max(results.length - 1, 0) : prev - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[activeIndex]) {
            handleSelect(results[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, activeIndex, handleSelect, onClose]
  );

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const q = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="cmd-highlight">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const typeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'section':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="1.5" y1="4.5" x2="12.5" y2="4.5" stroke="currentColor" strokeWidth="1" />
          </svg>
        );
      case 'department':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="3" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.5" />
            <line x1="3" y1="5.5" x2="12" y2="5.5" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        );
      case 'group':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="3" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          </svg>
        );
    }
  };

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="cmd-input-row">
          <svg className="cmd-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups, sections, departments..."
            spellCheck={false}
            autoComplete="off"
          />
          {query && (
            <button className="cmd-clear" onClick={() => setQuery('')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <kbd className="cmd-kbd">esc</kbd>
        </div>

        {/* Results */}
        <div className="cmd-results" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmd-empty">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <line x1="18" y1="18" x2="25" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              </svg>
              <span>No results for "{query}"</span>
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.nodeId}
                className={`cmd-result ${i === activeIndex ? 'cmd-result-active' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="cmd-result-swatch" style={{ background: item.color }} />
                <span className="cmd-result-icon" style={{ color: item.color }}>
                  {typeIcon(item.type)}
                </span>
                <span className="cmd-result-body">
                  <span className="cmd-result-label">{highlightMatch(item.label)}</span>
                  {item.sublabel && (
                    <span className="cmd-result-email">{highlightMatch(item.sublabel)}</span>
                  )}
                </span>
                {item.sectionName && (
                  <span className="cmd-result-section" style={{ color: item.color }}>
                    {item.sectionName}
                  </span>
                )}
                <span
                  className="cmd-result-type"
                  style={{
                    background: item.color + '18',
                    color: item.color,
                  }}
                >
                  {item.type === 'department' ? 'Dept' : item.type === 'section' ? 'Section' : 'Group'}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmd-footer">
          <span className="cmd-footer-hint">
            <kbd className="cmd-kbd-sm">↑↓</kbd> navigate
          </span>
          <span className="cmd-footer-hint">
            <kbd className="cmd-kbd-sm">↵</kbd> select
          </span>
          <span className="cmd-footer-hint">
            <kbd className="cmd-kbd-sm">esc</kbd> close
          </span>
          <span className="cmd-footer-count">
            {results.length} / {allItems.length}
          </span>
        </div>
      </div>
    </div>
  );
}
