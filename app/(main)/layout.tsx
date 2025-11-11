import { Header } from "@/components/header/Header"

/**
 * Main Layout
 *
 * 모든 메인 페이지에 공통으로 적용되는 레이아웃
 * - Header 자동 포함
 * - 배경 스타일 통일
 * - Route Groups: (main)은 URL에 포함되지 않음
 */
export default function MainLayout({
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
