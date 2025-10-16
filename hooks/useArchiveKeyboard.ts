import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  modifier?: 'ctrl' | 'cmd' | 'shift' | 'alt'
  group: 'navigation' | 'actions' | 'view' | 'help'
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: '↑',
    description: 'Move up in list',
    group: 'navigation'
  },
  {
    key: '↓',
    description: 'Move down in list',
    group: 'navigation'
  },
  {
    key: 'Enter',
    description: 'Open folder or select video',
    group: 'navigation'
  },
  {
    key: 'Backspace',
    description: 'Go to parent folder',
    group: 'navigation'
  },

  // Actions
  {
    key: 'Space',
    description: 'Play/Pause video',
    group: 'actions'
  },
  {
    key: 'A',
    description: 'Select all (in Unorganized)',
    modifier: 'ctrl',
    group: 'actions'
  },
  {
    key: 'Escape',
    description: 'Close dialog or clear selection',
    group: 'actions'
  },

  // View
  {
    key: 'F',
    description: 'Focus search box',
    modifier: 'ctrl',
    group: 'view'
  },
  {
    key: '1',
    description: 'Switch to List view',
    modifier: 'ctrl',
    group: 'view'
  },
  {
    key: '2',
    description: 'Switch to Grid view',
    modifier: 'ctrl',
    group: 'view'
  },
  {
    key: '3',
    description: 'Switch to Timeline view',
    modifier: 'ctrl',
    group: 'view'
  },

  // Help
  {
    key: '?',
    description: 'Show keyboard shortcuts',
    group: 'help'
  },
]

interface UseArchiveKeyboardOptions {
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onEnter?: () => void
  onBackspace?: () => void
  onSpace?: () => void
  onSelectAll?: () => void
  onEscape?: () => void
  onFocusSearch?: () => void
  onViewModeChange?: (mode: 'list' | 'grid' | 'timeline') => void
  onShowHelp?: () => void
  enabled?: boolean
}

export function useArchiveKeyboard({
  onNavigateUp,
  onNavigateDown,
  onEnter,
  onBackspace,
  onSpace,
  onSelectAll,
  onEscape,
  onFocusSearch,
  onViewModeChange,
  onShowHelp,
  enabled = true,
}: UseArchiveKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Ctrl+A in input fields
        if (e.key === 'Escape') {
          target.blur()
          onEscape?.()
          return
        }
        // Only allow Ctrl/Cmd+F to work in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault()
          onFocusSearch?.()
        }
        return
      }

      // Navigation shortcuts
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onNavigateUp?.()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        onNavigateDown?.()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onEnter?.()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onBackspace?.()
      }

      // Action shortcuts
      else if (e.key === ' ') {
        e.preventDefault()
        onSpace?.()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        onSelectAll?.()
      } else if (e.key === 'Escape') {
        onEscape?.()
      }

      // View shortcuts
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        onFocusSearch?.()
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        onViewModeChange?.('list')
      } else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault()
        onViewModeChange?.('grid')
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault()
        onViewModeChange?.('timeline')
      }

      // Help shortcut
      else if (e.key === '?' && !e.shiftKey) {
        e.preventDefault()
        onShowHelp?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    onNavigateUp,
    onNavigateDown,
    onEnter,
    onBackspace,
    onSpace,
    onSelectAll,
    onEscape,
    onFocusSearch,
    onViewModeChange,
    onShowHelp,
  ])

  return { shortcuts: KEYBOARD_SHORTCUTS }
}
