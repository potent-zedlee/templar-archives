/**
 * TreeNode Component
 *
 * VSCode/File Explorer 스타일의 트리 노드 컴포넌트
 * - 확장/축소 화살표
 * - 타입별 아이콘 (Tournament, Event, Stream, Hand)
 * - 선택/포커스 상태
 * - 메타데이터 (핸드 수, 이벤트 수 등)
 */

'use client'

import { memo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Video,
  PlaySquare,
  Loader2,
  Trophy,
  Calendar,
} from 'lucide-react'
import { CategoryLogo } from '@/components/common/CategoryLogo'
import type { TreeNode as TreeNodeType, TreeNodeType as NodeType } from '@/stores/archive-tree-store'

interface TreeNodeProps {
  node: TreeNodeType
  isExpanded: boolean
  isSelected: boolean
  isFocused: boolean
  isLoading: boolean
  onToggle: (nodeId: string) => void
  onClick: (node: TreeNodeType) => void
  onContextMenu?: (node: TreeNodeType, e: React.MouseEvent) => void
}

/**
 * 노드 타입별 아이콘 반환
 */
function getNodeIcon(
  type: NodeType,
  isExpanded: boolean,
  logoUrl?: string
): React.ReactNode {
  // Tournament with logo
  if (type === 'tournament' && logoUrl) {
    return (
      <CategoryLogo
        category={{ id: '', logoUrl: logoUrl }}
        size="sm"
        className="w-4 h-4"
      />
    )
  }

  // Default icons by type
  switch (type) {
    case 'tournament':
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      )
    case 'event':
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-green-500" />
      ) : (
        <Folder className="w-4 h-4 text-green-500" />
      )
    case 'stream':
      return <Video className="w-4 h-4 text-purple-500" />
    case 'hand':
      return <PlaySquare className="w-4 h-4 text-orange-500" />
    default:
      return <Folder className="w-4 h-4 text-muted-foreground" />
  }
}

/**
 * 노드 타입별 배지 색상
 */
function getBadgeVariant(type: NodeType): string {
  switch (type) {
    case 'tournament':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    case 'event':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    case 'stream':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    case 'hand':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export const TreeNodeComponent = memo(function TreeNodeComponent({
  node,
  isExpanded,
  isSelected,
  isFocused,
  isLoading,
  onToggle,
  onClick,
  onContextMenu,
}: TreeNodeProps) {
  // 확장 가능한 노드인지 (hand는 leaf 노드)
  const isExpandable = node.type !== 'hand'

  // 들여쓰기 계산 (level * 16px + 기본 8px)
  const indentation = node.level * 16 + 8

  // 화살표 클릭 핸들러
  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isExpandable && !isLoading) {
      onToggle(node.id)
    }
  }

  // 노드 클릭 핸들러
  const handleNodeClick = () => {
    onClick(node)
  }

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(node, e)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group flex items-center h-8 cursor-pointer select-none',
        'hover:bg-accent/50 transition-colors duration-100',
        isSelected && 'bg-accent',
        isFocused && !isSelected && 'bg-accent/30',
        isFocused && 'ring-1 ring-primary/50 ring-inset'
      )}
      style={{ paddingLeft: indentation }}
      onClick={handleNodeClick}
      onContextMenu={handleContextMenu}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={isExpandable ? isExpanded : undefined}
      tabIndex={isFocused ? 0 : -1}
    >
      {/* 확장/축소 화살표 */}
      <div
        className={cn(
          'w-5 h-5 flex items-center justify-center flex-shrink-0',
          isExpandable ? 'cursor-pointer' : 'invisible'
        )}
        onClick={handleToggleClick}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : isExpandable ? (
          isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )
        ) : null}
      </div>

      {/* 아이콘 */}
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mr-1.5">
        {getNodeIcon(node.type, isExpanded, node.meta.logoUrl)}
      </div>

      {/* 노드 이름 */}
      <span
        className={cn(
          'flex-1 truncate text-sm',
          isSelected ? 'font-medium' : 'font-normal',
          node.type === 'hand' && 'text-muted-foreground'
        )}
        title={node.name}
      >
        {node.name}
      </span>

      {/* 메타데이터 배지 */}
      <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Event count for tournament */}
        {node.type === 'tournament' && node.meta.count !== undefined && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-sm',
              getBadgeVariant('event')
            )}
            title={`${node.meta.count} events`}
          >
            <Calendar className="w-3 h-3 inline mr-0.5" />
            {node.meta.count}
          </span>
        )}

        {/* Stream count for event */}
        {node.type === 'event' && node.meta.count !== undefined && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-sm',
              getBadgeVariant('stream')
            )}
            title={`${node.meta.count} streams`}
          >
            <Video className="w-3 h-3 inline mr-0.5" />
            {node.meta.count}
          </span>
        )}

        {/* Hand count for stream */}
        {node.type === 'stream' && node.meta.handCount !== undefined && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-sm',
              getBadgeVariant('hand')
            )}
            title={`${node.meta.handCount} hands`}
          >
            <Trophy className="w-3 h-3 inline mr-0.5" />
            {node.meta.handCount}
          </span>
        )}
      </div>

      {/* 항상 표시되는 카운트 (hover 아닐 때) */}
      <div className="flex items-center gap-1 mr-2 group-hover:opacity-0 transition-opacity">
        {node.type === 'stream' && node.meta.handCount !== undefined && node.meta.handCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({node.meta.handCount})
          </span>
        )}
        {node.type === 'tournament' && node.meta.count !== undefined && node.meta.count > 0 && (
          <span className="text-xs text-muted-foreground">
            ({node.meta.count})
          </span>
        )}
        {node.type === 'event' && node.meta.count !== undefined && node.meta.count > 0 && (
          <span className="text-xs text-muted-foreground">
            ({node.meta.count})
          </span>
        )}
      </div>
    </motion.div>
  )
})

export { TreeNodeComponent as TreeNode }
