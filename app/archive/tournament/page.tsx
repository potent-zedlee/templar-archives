/**
 * Archive Tournament Page
 *
 * Tournament 전용 Archive 페이지
 * ArchivePageLayout 공통 컴포넌트 사용
 */

import { ArchivePageLayout } from "../_components/ArchivePageLayout"

export default function TournamentArchivePage() {
  return <ArchivePageLayout gameType="tournament" />
}
