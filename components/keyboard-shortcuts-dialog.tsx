"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { KEYBOARD_SHORTCUTS, type KeyboardShortcut } from "@/hooks/useArchiveKeyboard"
import { Keyboard } from "lucide-react"

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsDialog({
  isOpen,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  // Group shortcuts by category
  const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.group]) {
      acc[shortcut.group] = []
    }
    acc[shortcut.group].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const groupTitles: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    view: 'View',
    help: 'Help',
  }

  const formatKey = (shortcut: KeyboardShortcut) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modifier = shortcut.modifier
    let modifierText = ''

    if (modifier === 'ctrl') {
      modifierText = isMac ? '⌘' : 'Ctrl'
    } else if (modifier === 'cmd') {
      modifierText = '⌘'
    } else if (modifier === 'shift') {
      modifierText = isMac ? '⇧' : 'Shift'
    } else if (modifier === 'alt') {
      modifierText = isMac ? '⌥' : 'Alt'
    }

    return modifierText ? `${modifierText} + ${shortcut.key}` : shortcut.key
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Navigate and interact with the Archive using these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([group, shortcuts]) => (
            <div key={group} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {groupTitles[group]}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={`${group}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md shadow-sm">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">?</kbd> to toggle this dialog
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
