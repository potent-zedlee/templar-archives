/**
 * TreeContextMenu Component
 *
 * 트리 노드 우클릭 시 표시되는 컨텍스트 메뉴
 * - VSCode/Finder 스타일 컨텍스트 메뉴
 * - 노드 타입별 다른 액션
 * - 키보드 네비게이션 지원
 */

'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  Play,
  FolderOpen,
  ExternalLink,
  Copy,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Eye,
} from 'lucide-react'
import type { TreeNode as TreeNodeType } from '@/stores/archive-tree-store'

interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  dividerAfter?: boolean
}

interface TreeContextMenuProps {
  node: TreeNodeType | null
  position: { x: number; y: number }
  isOpen: boolean
  onClose: () => void
  onOpenStream?: (streamId: string) => void
  onExpandAll?: (nodeId: string) => void
  onCollapseAll?: (nodeId: string) => void
  onCopyLink?: (node: TreeNodeType) => void
  onBookmark?: (node: TreeNodeType) => void
  onShare?: (node: TreeNodeType) => void
  isBookmarked?: boolean
}

export function TreeContextMenu({
  node,
  position,
  isOpen,
  onClose,
  onOpenStream,
  onExpandAll,
  onCollapseAll,
  onCopyLink,
  onBookmark,
  onShare,
  isBookmarked = false,
}: TreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 아이템 구성
  const getMenuItems = (): MenuItem[] => {
    if (!node) return []

    const items: MenuItem[] = []

    // 공통 액션
    if (node.type === 'stream') {
      // 스트림 전용 메뉴
      items.push({
        id: 'open',
        label: 'Open Stream',
        icon: Play,
        shortcut: 'Enter',
        onClick: () => {
          onOpenStream?.(node.id)
          onClose()
        },
      })

      if (node.meta?.videoUrl) {
        items.push({
          id: 'openExternal',
          label: 'Open in YouTube',
          icon: ExternalLink,
          onClick: () => {
            window.open(node.meta?.videoUrl, '_blank')
            onClose()
          },
        })
      }

      items.push({
        id: 'divider1',
        label: '',
        icon: Eye,
        onClick: () => {},
        dividerAfter: true,
      })
    }

    if (node.type === 'tournament' || node.type === 'event') {
      // 폴더 타입 메뉴
      items.push({
        id: 'expandAll',
        label: 'Expand All',
        icon: FolderOpen,
        onClick: () => {
          onExpandAll?.(node.id)
          onClose()
        },
      })

      items.push({
        id: 'collapseAll',
        label: 'Collapse All',
        icon: FolderOpen,
        onClick: () => {
          onCollapseAll?.(node.id)
          onClose()
        },
        dividerAfter: true,
      })
    }

    // 공통 액션
    items.push({
      id: 'copyLink',
      label: 'Copy Link',
      icon: Copy,
      shortcut: '⌘C',
      onClick: () => {
        onCopyLink?.(node)
        onClose()
      },
    })

    items.push({
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: () => {
        onShare?.(node)
        onClose()
      },
    })

    items.push({
      id: 'bookmark',
      label: isBookmarked ? 'Remove Bookmark' : 'Add Bookmark',
      icon: isBookmarked ? BookmarkCheck : Bookmark,
      onClick: () => {
        onBookmark?.(node)
        onClose()
      },
    })

    return items.filter(item => item.id !== 'divider1' || !item.dividerAfter)
  }

  const menuItems = getMenuItems()

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 300),
  }

  return (
    <AnimatePresence>
      {isOpen && node && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
          role="menu"
          aria-label="Context menu"
        >
          {/* 헤더 - 노드 이름 */}
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground truncate">
              {node.name}
            </div>
          </div>

          {/* 메뉴 아이템 */}
          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item.dividerAfter && index < menuItems.length - 1) {
                return (
                  <div key={item.id}>
                    <ContextMenuItem item={item} />
                    <div className="my-1 h-px bg-border" />
                  </div>
                )
              }
              return <ContextMenuItem key={item.id} item={item} />
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 개별 메뉴 아이템 컴포넌트
 */
function ContextMenuItem({ item }: { item: MenuItem }) {
  const Icon = item.icon

  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground focus:outline-none',
        item.disabled && 'opacity-50 cursor-not-allowed',
        item.danger && 'text-destructive hover:bg-destructive/10'
      )}
      onClick={item.onClick}
      disabled={item.disabled}
      role="menuitem"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.shortcut && (
        <span className="text-xs text-muted-foreground">{item.shortcut}</span>
      )}
    </button>
  )
}

/**
 * 서브메뉴가 있는 메뉴 아이템 (향후 확장용)
 */
export function ContextMenuItemWithSubmenu({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="relative group">
      <button
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground'
        )}
        role="menuitem"
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className="w-3 h-3" />
      </button>

      {/* 서브메뉴 */}
      <div className="absolute left-full top-0 ml-1 hidden group-hover:block">
        <div className="min-w-[160px] bg-popover border border-border rounded-lg shadow-xl py-1">
          {children}
        </div>
      </div>
    </div>
  )
}
