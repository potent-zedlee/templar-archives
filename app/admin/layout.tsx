import { Header } from "@/components/header"

/**
 * Admin Layout
 *
 * 모든 /admin/* 페이지에 공통으로 적용되는 레이아웃
 * - Header 자동 포함
 * - 배경 스타일 통일
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      {children}
    </div>
  )
}
