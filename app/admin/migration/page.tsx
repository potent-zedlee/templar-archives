'use client'


import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react'

const MIGRATION_SQL = `-- Add starting_stack and ending_stack to hand_players table
ALTER TABLE hand_players
ADD COLUMN IF NOT EXISTS starting_stack BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_stack BIGINT DEFAULT 0;

-- Create hand_actions table for detailed action tracking
CREATE TABLE IF NOT EXISTS hand_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  street TEXT NOT NULL CHECK (street IN ('preflop', 'flop', 'turn', 'river')),
  action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in')),
  amount BIGINT DEFAULT 0,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_player_id ON hand_actions(player_id);
CREATE INDEX IF NOT EXISTS idx_hand_actions_street ON hand_actions(street);
CREATE INDEX IF NOT EXISTS idx_hand_actions_sequence ON hand_actions(hand_id, sequence);

-- Add comments for documentation
COMMENT ON COLUMN hand_players.starting_stack IS 'Player stack at hand start';
COMMENT ON COLUMN hand_players.ending_stack IS 'Player stack at hand end';
COMMENT ON TABLE hand_actions IS 'Detailed action history for each hand';`

export default function MigrationClient() {
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState(1)

  const projectId = 'diopilmkehygiqpizvga'
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(MIGRATION_SQL)
    setCopied(true)
    setStep(2)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleOpenSupabase = () => {
    window.open(sqlEditorUrl, '_blank')
    setStep(3)
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">데이터베이스 마이그레이션</CardTitle>
          <CardDescription>
            핸드 수정 UI와 플레이어 통계 기능을 사용하기 위한 데이터베이스 업데이트
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: SQL 복사 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <h3 className="text-body-lg font-semibold">SQL 복사</h3>
            </div>

            <Alert>
              <AlertDescription>
                아래 SQL을 클립보드에 복사합니다.
              </AlertDescription>
            </Alert>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-caption font-mono">
                {MIGRATION_SQL}
              </pre>
            </div>

            <Button
              onClick={handleCopy}
              className="w-full"
              size="lg"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? 'SQL 복사됨!' : 'SQL 복사하기'}
            </Button>
          </div>

          {/* Step 2: Supabase 열기 */}
          {step >= 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : '2'}
                </div>
                <h3 className="text-body-lg font-semibold">Supabase SQL Editor 열기</h3>
              </div>

              <Alert>
                <AlertDescription>
                  Supabase 대시보드의 SQL Editor를 엽니다.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleOpenSupabase}
                className="w-full"
                size="lg"
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Supabase SQL Editor 열기
              </Button>
            </div>
          )}

          {/* Step 3: 실행 안내 */}
          {step >= 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <h3 className="text-body-lg font-semibold">SQL 실행</h3>
              </div>

              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-caption">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Supabase SQL Editor에서 <kbd className="px-2 py-1 bg-white rounded border">Cmd + V</kbd> (또는 <kbd className="px-2 py-1 bg-white rounded border">Ctrl + V</kbd>)를 눌러 SQL을 붙여넣습니다.</li>
                    <li><strong className="text-green-600">Run</strong> 버튼을 클릭하여 실행합니다.</li>
                    <li>성공 메시지를 확인한 후 이 페이지로 돌아옵니다.</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="mt-6 pt-6 border-t">
                <p className="text-caption text-muted-foreground mb-4">
                  마이그레이션이 완료되었나요? 아래 버튼을 클릭하여 확인하세요.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                  size="lg"
                >
                  마이그레이션 완료 확인
                </Button>
              </div>
            </div>
          )}

          {/* 추가 정보 */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="text-body font-semibold mb-2">이 마이그레이션은 무엇을 하나요?</h4>
            <ul className="list-disc list-inside text-caption text-muted-foreground space-y-1">
              <li><code>hand_players</code> 테이블에 <code>starting_stack</code>, <code>ending_stack</code> 컬럼 추가</li>
              <li><code>hand_actions</code> 테이블 생성 (핸드 액션 상세 기록)</li>
              <li>성능 향상을 위한 인덱스 생성</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
