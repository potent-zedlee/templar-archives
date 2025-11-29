/**
 * FileTreeExplorer Component
 *
 * VSCode/File Explorer 스타일의 트리 네비게이션 컴포넌트
 * - Tournament → Event → Stream 계층 구조 표시
 * - 확장/축소 기능
 * - 검색 기능
 * - 키보드 네비게이션 지원
 */

'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, X, FolderTree, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TreeNode } from './TreeNode'
import {
  useArchiveTreeStore,
  type TreeNode as TreeNodeType,
  type TreeNodeType as NodeType,
} from '@/stores/archive-tree-store'
import type { Tournament, Event, Stream, BreadcrumbItem } from '@/lib/types/archive'

interface FileTreeExplorerProps {
  tournaments: Tournament[]
  className?: string
  onNodeSelect?: (
    nodeId: string,
    nodeType: NodeType,
    data: Tournament | Event | Stream | null
  ) => void
  onBreadcrumbChange?: (path: BreadcrumbItem[]) => void
  onContextMenu?: (node: TreeNodeType, e: React.MouseEvent) => void
}

/**
 * Tournament 데이터를 TreeNode로 변환
 */
function convertToTreeNodes(tournaments: Tournament[]): TreeNodeType[] {
  const nodes: TreeNodeType[] = []

  tournaments.forEach((tournament) => {
    // Tournament 노드
    const tournamentNode: TreeNodeType = {
      id: tournament.id,
      name: tournament.name,
      type: 'tournament',
      level: 0,
      meta: {
        count: tournament.events?.length || 0,
        logoUrl: tournament.category_logo_url || tournament.category_logo,
      },
      children: [],
    }

    // Event 노드들
    tournament.events?.forEach((event) => {
      const eventNode: TreeNodeType = {
        id: event.id,
        name: event.name,
        type: 'event',
        level: 1,
        parentId: tournament.id,
        meta: {
          count: event.streams?.length || 0,
        },
        children: [],
      }

      // Stream 노드들
      event.streams?.forEach((stream) => {
        const streamNode: TreeNodeType = {
          id: stream.id,
          name: stream.name,
          type: 'stream',
          level: 2,
          parentId: event.id,
          meta: {
            handCount: stream.hand_count || 0,
            videoUrl: stream.video_url,
          },
        }
        eventNode.children?.push(streamNode)
      })

      tournamentNode.children?.push(eventNode)
    })

    nodes.push(tournamentNode)
  })

  return nodes
}

/**
 * 트리 노드를 플랫 리스트로 변환 (키보드 네비게이션용)
 */
function flattenTreeNodes(
  nodes: TreeNodeType[],
  expandedNodes: Set<string>
): TreeNodeType[] {
  const result: TreeNodeType[] = []

  function traverse(nodeList: TreeNodeType[]) {
    nodeList.forEach((node) => {
      result.push(node)
      if (node.children && expandedNodes.has(node.id)) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return result
}

/**
 * 검색 필터링
 */
function filterTreeNodes(
  nodes: TreeNodeType[],
  query: string
): TreeNodeType[] {
  if (!query.trim()) return nodes

  const lowerQuery = query.toLowerCase()

  function filterNode(node: TreeNodeType): TreeNodeType | null {
    const nameMatch = node.name.toLowerCase().includes(lowerQuery)

    // 자식 노드 필터링
    const filteredChildren = node.children
      ?.map(filterNode)
      .filter((n): n is TreeNodeType => n !== null)

    // 이름이 매치되거나 자식이 매치되면 포함
    if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren,
      }
    }

    return null
  }

  return nodes
    .map(filterNode)
    .filter((n): n is TreeNodeType => n !== null)
}

export function FileTreeExplorer({
  tournaments,
  className,
  onNodeSelect,
  onBreadcrumbChange,
  onContextMenu,
}: FileTreeExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Store state
  const {
    expandedNodes,
    selectedNodeId,
    loadingNodes,
    treeSearchQuery,
    focusedNodeId,
    expandNode,
    toggleNode,
    selectNode,
    setTreeSearchQuery,
    clearSearch,
    setFlatNodeList,
    moveUp,
    moveDown,
    expandFocused,
    collapseFocused,
    selectFocused,
    expandAll,
    collapseAll,
    setBreadcrumb,
  } = useArchiveTreeStore()

  // Tournament 데이터를 트리 노드로 변환
  const treeNodes = useMemo(
    () => convertToTreeNodes(tournaments),
    [tournaments]
  )

  // 검색 필터링 적용
  const filteredNodes = useMemo(
    () => filterTreeNodes(treeNodes, treeSearchQuery),
    [treeNodes, treeSearchQuery]
  )

  // 플랫 노드 리스트 업데이트 (키보드 네비게이션용)
  useEffect(() => {
    const flatNodes = flattenTreeNodes(filteredNodes, expandedNodes)
    setFlatNodeList(flatNodes)
  }, [filteredNodes, expandedNodes, setFlatNodeList])

  // 노드 토글 핸들러
  const handleToggle = (nodeId: string) => {
    toggleNode(nodeId)
  }

  // 노드 클릭 핸들러
  const handleNodeClick = (node: TreeNodeType) => {
    selectNode(node.id, node.type)

    // Breadcrumb 업데이트
    const newBreadcrumb: BreadcrumbItem[] = [
      { id: 'home', name: 'Archive', type: 'home' },
    ]

    if (node.type === 'tournament') {
      newBreadcrumb.push({
        id: node.id,
        name: node.name,
        type: 'tournament',
      })
    } else if (node.type === 'event') {
      // 부모 tournament 찾기
      const parentTournament = treeNodes.find((t) =>
        t.children?.some((e) => e.id === node.id)
      )
      if (parentTournament) {
        newBreadcrumb.push({
          id: parentTournament.id,
          name: parentTournament.name,
          type: 'tournament',
        })
      }
      newBreadcrumb.push({
        id: node.id,
        name: node.name,
        type: 'event',
      })
    } else if (node.type === 'stream') {
      // 부모 tournament, event 찾기
      treeNodes.forEach((tournament) => {
        tournament.children?.forEach((event) => {
          if (event.children?.some((s) => s.id === node.id)) {
            newBreadcrumb.push({
              id: tournament.id,
              name: tournament.name,
              type: 'tournament',
            })
            newBreadcrumb.push({
              id: event.id,
              name: event.name,
              type: 'event',
            })
          }
        })
      })
    }

    setBreadcrumb(newBreadcrumb)
    onBreadcrumbChange?.(newBreadcrumb)

    // 부모 컴포넌트에 알림
    if (onNodeSelect) {
      // 실제 데이터 찾기
      let data: Tournament | Event | Stream | null = null

      if (node.type === 'tournament') {
        data = tournaments.find((t) => t.id === node.id) || null
      } else if (node.type === 'event') {
        tournaments.forEach((t) => {
          const event = t.events?.find((e) => e.id === node.id)
          if (event) data = event
        })
      } else if (node.type === 'stream') {
        tournaments.forEach((t) => {
          t.events?.forEach((e) => {
            const stream = e.streams?.find((s) => s.id === node.id)
            if (stream) data = stream
          })
        })
      }

      onNodeSelect(node.id, node.type, data)
    }

    // stream이면 자동 확장
    if (node.type !== 'stream' && node.type !== 'hand') {
      if (!expandedNodes.has(node.id)) {
        expandNode(node.id)
      }
    }
  }

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = (node: TreeNodeType, e: React.MouseEvent) => {
    onContextMenu?.(node, e)
  }

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        moveUp()
        break
      case 'ArrowDown':
        e.preventDefault()
        moveDown()
        break
      case 'ArrowRight':
        e.preventDefault()
        expandFocused()
        break
      case 'ArrowLeft':
        e.preventDefault()
        collapseFocused()
        break
      case 'Enter':
        e.preventDefault()
        selectFocused()
        break
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
        break
      case 'Escape':
        if (treeSearchQuery) {
          clearSearch()
        }
        break
    }
  }

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTreeSearchQuery(e.target.value)

    // 검색 시 모든 노드 확장
    if (e.target.value.trim()) {
      filteredNodes.forEach((node) => {
        expandNode(node.id)
        node.children?.forEach((child) => {
          expandNode(child.id)
        })
      })
    }
  }

  // 재귀적으로 트리 노드 렌더링
  const renderTreeNodes = (nodes: TreeNodeType[]) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <TreeNode
          node={node}
          isExpanded={expandedNodes.has(node.id)}
          isSelected={selectedNodeId === node.id}
          isFocused={focusedNodeId === node.id}
          isLoading={loadingNodes.has(node.id)}
          onToggle={handleToggle}
          onClick={handleNodeClick}
          onContextMenu={handleContextMenu}
        />
        <AnimatePresence>
          {node.children && expandedNodes.has(node.id) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderTreeNodes(node.children)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ))
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full bg-background border-r border-border',
        className
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tree"
      aria-label="Archive navigation"
    >
      {/* 헤더 */}
      <div className="flex-shrink-0 p-3 border-b border-border">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search archive... (Ctrl+F)"
            value={treeSearchQuery}
            onChange={handleSearchChange}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {treeSearchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6"
              onClick={clearSearch}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={expandAll}
            title="Expand all"
          >
            <ChevronDown className="w-3.5 h-3.5 mr-1" />
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={collapseAll}
            title="Collapse all"
          >
            <ChevronUp className="w-3.5 h-3.5 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* 트리 컨텐츠 */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filteredNodes.length > 0 ? (
            renderTreeNodes(filteredNodes)
          ) : treeSearchQuery ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FolderTree className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No tournaments</p>
              <p className="text-xs mt-1">Create a tournament to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 푸터 - 통계 */}
      <div className="flex-shrink-0 p-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}
          </span>
          {treeSearchQuery && (
            <span>
              {filteredNodes.length} result{filteredNodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
