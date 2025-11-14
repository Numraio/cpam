import { useEffect, useState } from 'react';

/**
 * Hook for managing command palette state and keyboard shortcuts
 * Provides global keyboard listener for ⌘K / Ctrl+K
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // ESC to close
      if (e.key === 'Escape') {
        setOpen(false);
      }

      // Go-to shortcuts (G then letter)
      // Store the last key pressed for sequence shortcuts
      const lastKey = (e as any).__lastKey;
      if (lastKey === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleGoToShortcut(e.key);
      }

      // Store current key for next event
      (e as any).__lastKey = e.key;
    };

    const handleGoToShortcut = (key: string) => {
      const shortcuts: Record<string, string> = {
        'd': '/dashboard',
        'i': '/items',
        's': '/index-series',
        'p': '/pams',
        'e': '/scenarios',
        'c': '/comparator',
        'a': '/calculations',
        'v': '/approvals',
        'r': '/reports',
      };

      const path = shortcuts[key.toLowerCase()];
      if (path) {
        window.location.href = path;
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
