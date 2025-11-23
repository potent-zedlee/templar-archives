"use client"

import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"

interface DiscoveryLayoutProps {
  sidebar: ReactNode
  middlePanel?: ReactNode
  mainPanel: ReactNode
  className?: string
  sidebarWidth?: string
  middlePanelWidth?: string
}

/**
 * Discovery Agent 스타일 3단 레이아웃
 * - 왼쪽 사이드바: 네비게이션/필터
 * - 중간 패널: 목록/히스토리 (선택사항)
 * - 메인 패널: 주요 콘텐츠
 *
 * 반응형:
 * - 데스크톱: 3단 레이아웃
 * - 모바일: Sheet로 사이드바/중간패널 전환
 */
export function DiscoveryLayout({
  sidebar,
  middlePanel,
  mainPanel,
  className,
  sidebarWidth = "200px",
  middlePanelWidth = "300px"
}: DiscoveryLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [middlePanelCollapsed, setMiddlePanelCollapsed] = useState(false)

  // Tailwind cannot generate classes from dynamic width strings,
  // so rely on inline styles for predictable sizing.
  const sidebarStyle = sidebarCollapsed ? { width: 0 } : { width: sidebarWidth }
  const middlePanelStyle = middlePanelCollapsed ? { width: 0 } : { width: middlePanelWidth }

  return (
    <div className={cn("flex h-[calc(100vh-4rem)] overflow-hidden", className)}>
      {/* Mobile: Sidebar Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-20 z-40"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            {sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300 overflow-hidden",
          sidebarCollapsed && "border-transparent"
        )}
        style={sidebarStyle}
      >
        {!sidebarCollapsed && sidebar}
      </div>

      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex absolute left-0 top-20 z-40 h-8 w-8"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      {/* Middle Panel (Optional) */}
      {middlePanel && (
        <>
          {/* Mobile: Middle Panel Sheet */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="fixed left-16 top-20 z-40"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[320px]">
                {middlePanel}
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop: Middle Panel */}
          <div
            className={cn(
              "hidden lg:flex flex-col h-full border-r bg-card transition-all duration-300",
              middlePanelCollapsed && "border-transparent"
            )}
            style={middlePanelStyle}
          >
            {!middlePanelCollapsed && middlePanel}
          </div>

          {/* Middle Panel Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden lg:flex absolute top-20 z-40 h-8 w-8",
              "left-0"
            )}
            style={!sidebarCollapsed ? { left: sidebarWidth } : undefined}
            onClick={() => setMiddlePanelCollapsed(!middlePanelCollapsed)}
          >
            {middlePanelCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </>
      )}

      {/* Main Panel */}
      <div className="flex-1 overflow-auto bg-background">
        {mainPanel}
      </div>
    </div>
  )
}
