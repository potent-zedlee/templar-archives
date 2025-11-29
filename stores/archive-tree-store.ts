/**
 * Archive Tree Store
 *
 * VSCode/File Explorer 스타일 트리 네비게이션을 위한 Zustand store
 * - 트리 확장/축소 상태
 * - 노드 선택 상태
 * - Breadcrumb 경로
 * - 트리 검색
 * - 키보드 네비게이션
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { BreadcrumbItem } from '@/lib/types/archive'

// ==================== Types ====================

export type TreeNodeType = 'tournament' | 'event' | 'stream' | 'hand'

export interface TreeNode {
  id: string
  name: string
  type: TreeNodeType
  level: number
  parentId?: string
  children?: TreeNode[]
  meta: {
    count?: number
    handCount?: number
    logoUrl?: string
    videoUrl?: string
  }
}

interface ArchiveTreeState {
  // 트리 상태
  expandedNodes: Set<string>
  selectedNodeId: string | null
  selectedNodeType: TreeNodeType | null
  loadingNodes: Set<string>

  // Breadcrumb
  breadcrumbPath: BreadcrumbItem[]

  // 검색
  treeSearchQuery: string
  searchResults: TreeNode[]

  // 포커스된 노드 (키보드 네비게이션용)
  focusedNodeId: string | null

  // 플랫 노드 리스트 (키보드 네비게이션용)
  flatNodeList: TreeNode[]

  // 액션 - 트리 확장/축소
  expandNode: (nodeId: string) => void
  collapseNode: (nodeId: string) => void
  toggleNode: (nodeId: string) => void
  expandAll: () => void
  collapseAll: () => void

  // 액션 - 노드 선택
  selectNode: (nodeId: string | null, type: TreeNodeType | null) => void
  clearSelection: () => void

  // 액션 - 로딩 상태
  setNodeLoading: (nodeId: string, loading: boolean) => void

  // 액션 - Breadcrumb
  setBreadcrumb: (path: BreadcrumbItem[]) => void
  navigateToBreadcrumb: (item: BreadcrumbItem | null) => void

  // 액션 - 검색
  setTreeSearchQuery: (query: string) => void
  setSearchResults: (results: TreeNode[]) => void
  clearSearch: () => void

  // 액션 - 키보드 네비게이션
  setFocusedNode: (nodeId: string | null) => void
  setFlatNodeList: (nodes: TreeNode[]) => void
  moveUp: () => void
  moveDown: () => void
  expandFocused: () => void
  collapseFocused: () => void
  selectFocused: () => void

  // 액션 - 리셋
  reset: () => void
}

// ==================== Initial State ====================

const initialState = {
  expandedNodes: new Set<string>(),
  selectedNodeId: null,
  selectedNodeType: null,
  loadingNodes: new Set<string>(),
  breadcrumbPath: [{ id: 'home', name: 'Archive', type: 'home' as const }],
  treeSearchQuery: '',
  searchResults: [],
  focusedNodeId: null,
  flatNodeList: [],
}

// ==================== Store ====================

export const useArchiveTreeStore = create<ArchiveTreeState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 트리 확장/축소
      expandNode: (nodeId) =>
        set((state) => {
          const newSet = new Set(state.expandedNodes)
          newSet.add(nodeId)
          return { expandedNodes: newSet }
        }),

      collapseNode: (nodeId) =>
        set((state) => {
          const newSet = new Set(state.expandedNodes)
          newSet.delete(nodeId)
          return { expandedNodes: newSet }
        }),

      toggleNode: (nodeId) =>
        set((state) => {
          const newSet = new Set(state.expandedNodes)
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId)
          } else {
            newSet.add(nodeId)
          }
          return { expandedNodes: newSet }
        }),

      expandAll: () =>
        set((state) => {
          const allNodeIds = state.flatNodeList
            .filter((node) => node.type !== 'hand')
            .map((node) => node.id)
          return { expandedNodes: new Set(allNodeIds) }
        }),

      collapseAll: () =>
        set({ expandedNodes: new Set() }),

      // 노드 선택
      selectNode: (nodeId, type) =>
        set({
          selectedNodeId: nodeId,
          selectedNodeType: type,
          focusedNodeId: nodeId,
        }),

      clearSelection: () =>
        set({
          selectedNodeId: null,
          selectedNodeType: null,
        }),

      // 로딩 상태
      setNodeLoading: (nodeId, loading) =>
        set((state) => {
          const newSet = new Set(state.loadingNodes)
          if (loading) {
            newSet.add(nodeId)
          } else {
            newSet.delete(nodeId)
          }
          return { loadingNodes: newSet }
        }),

      // Breadcrumb
      setBreadcrumb: (path) =>
        set({ breadcrumbPath: path }),

      navigateToBreadcrumb: (item) => {
        if (!item || item.type === 'home') {
          set({
            breadcrumbPath: [{ id: 'home', name: 'Archive', type: 'home' }],
            selectedNodeId: null,
            selectedNodeType: null,
          })
        } else {
          const { breadcrumbPath } = get()
          const index = breadcrumbPath.findIndex((b) => b.id === item.id)
          if (index !== -1) {
            set({
              breadcrumbPath: breadcrumbPath.slice(0, index + 1),
              selectedNodeId: item.id,
              selectedNodeType: item.type as TreeNodeType,
            })
          }
        }
      },

      // 검색
      setTreeSearchQuery: (query) =>
        set({ treeSearchQuery: query }),

      setSearchResults: (results) =>
        set({ searchResults: results }),

      clearSearch: () =>
        set({
          treeSearchQuery: '',
          searchResults: [],
        }),

      // 키보드 네비게이션
      setFocusedNode: (nodeId) =>
        set({ focusedNodeId: nodeId }),

      setFlatNodeList: (nodes) =>
        set({ flatNodeList: nodes }),

      moveUp: () => {
        const { flatNodeList, focusedNodeId, expandedNodes } = get()

        // 보이는 노드만 필터링 (부모가 확장된 경우만)
        const visibleNodes = flatNodeList.filter((node) => {
          if (node.level === 0) return true
          // 부모 노드가 확장되어 있는지 확인
          const parentNode = flatNodeList.find((n) =>
            n.type !== 'hand' &&
            node.parentId === n.id
          )
          if (!parentNode) return node.level === 0
          return expandedNodes.has(parentNode.id)
        })

        if (visibleNodes.length === 0) return

        const currentIndex = visibleNodes.findIndex((n) => n.id === focusedNodeId)
        if (currentIndex > 0) {
          set({ focusedNodeId: visibleNodes[currentIndex - 1].id })
        } else if (currentIndex === -1 && visibleNodes.length > 0) {
          set({ focusedNodeId: visibleNodes[0].id })
        }
      },

      moveDown: () => {
        const { flatNodeList, focusedNodeId, expandedNodes } = get()

        // 보이는 노드만 필터링
        const visibleNodes = flatNodeList.filter((node) => {
          if (node.level === 0) return true
          const parentNode = flatNodeList.find((n) =>
            n.type !== 'hand' &&
            node.parentId === n.id
          )
          if (!parentNode) return node.level === 0
          return expandedNodes.has(parentNode.id)
        })

        if (visibleNodes.length === 0) return

        const currentIndex = visibleNodes.findIndex((n) => n.id === focusedNodeId)
        if (currentIndex < visibleNodes.length - 1) {
          set({ focusedNodeId: visibleNodes[currentIndex + 1].id })
        } else if (currentIndex === -1 && visibleNodes.length > 0) {
          set({ focusedNodeId: visibleNodes[0].id })
        }
      },

      expandFocused: () => {
        const { focusedNodeId, expandedNodes } = get()
        if (!focusedNodeId) return

        if (!expandedNodes.has(focusedNodeId)) {
          get().expandNode(focusedNodeId)
        } else {
          // 이미 확장된 경우, 첫 번째 자식으로 이동
          get().moveDown()
        }
      },

      collapseFocused: () => {
        const { focusedNodeId, expandedNodes, flatNodeList } = get()
        if (!focusedNodeId) return

        if (expandedNodes.has(focusedNodeId)) {
          get().collapseNode(focusedNodeId)
        } else {
          // 축소된 경우, 부모로 이동
          const currentNode = flatNodeList.find((n) => n.id === focusedNodeId)
          if (currentNode?.parentId) {
            set({ focusedNodeId: currentNode.parentId })
          }
        }
      },

      selectFocused: () => {
        const { focusedNodeId, flatNodeList } = get()
        if (!focusedNodeId) return

        const node = flatNodeList.find((n) => n.id === focusedNodeId)
        if (node) {
          get().selectNode(node.id, node.type)
        }
      },

      // 리셋
      reset: () => set(initialState),
    }),
    { name: 'ArchiveTreeStore' }
  )
)

// ==================== Selectors ====================

/**
 * 노드가 확장되어 있는지 확인
 */
export const isNodeExpanded = (nodeId: string) =>
  useArchiveTreeStore.getState().expandedNodes.has(nodeId)

/**
 * 노드가 선택되어 있는지 확인
 */
export const isNodeSelected = (nodeId: string) =>
  useArchiveTreeStore.getState().selectedNodeId === nodeId

/**
 * 노드가 로딩 중인지 확인
 */
export const isNodeLoading = (nodeId: string) =>
  useArchiveTreeStore.getState().loadingNodes.has(nodeId)
