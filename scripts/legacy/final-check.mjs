import { createClient } from '@supabase/supabase-js'

console.log('🎯 최종 설정 확인\n')
console.log('='.repeat(60))

// 환경 변수 확인
const envVars = {
  'GOOGLE_API_KEY': process.env.GOOGLE_API_KEY,
  'YOUTUBE_API_KEY': process.env.YOUTUBE_API_KEY,
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET ? '설정됨' : '미설정',
  'KHALAI_ARCHIVE_NETWORK_URL': process.env.KHALAI_ARCHIVE_NETWORK_URL,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '미설정',
}

console.log('\n1️⃣  환경 변수 확인\n')
for (const [key, value] of Object.entries(envVars)) {
  const status = value ? '✅' : '❌'
  let displayValue = value
  if (value && value.length > 50) {
    displayValue = value.substring(0, 30) + '...'
  }
  console.log(status + ' ' + key + ': ' + (displayValue || '미설정'))
}

// Supabase OAuth 확인
console.log('\n' + '='.repeat(60))
console.log('\n2️⃣  Supabase Google OAuth 확인\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase 환경 변수가 설정되지 않았습니다.')
} else {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        skipBrowserRedirect: true
      }
    })

    if (error) {
      console.log('❌ OAuth 오류:', error.message)
    } else if (data && data.url) {
      console.log('✅ Google OAuth 활성화 확인')
      console.log('✅ 로그인 URL 생성 가능')
    }
  } catch (err) {
    console.log('❌ 에러:', err.message)
  }
}

// KAN Backend 확인
console.log('\n' + '='.repeat(60))
console.log('\n3️⃣  KAN Backend 연결 확인\n')

const kanBackendUrl = process.env.KHALAI_ARCHIVE_NETWORK_URL

if (!kanBackendUrl) {
  console.log('❌ KHALAI_ARCHIVE_NETWORK_URL이 설정되지 않았습니다.')
} else {
  console.log('KAN Backend URL: ' + kanBackendUrl)
  
  try {
    const response = await fetch(kanBackendUrl + '/health')
    const data = await response.json()
    
    if (response.ok && data.status === 'healthy') {
      console.log('✅ KAN Backend 정상 작동')
      console.log('   - Environment: ' + data.environment)
      console.log('   - Version: ' + data.version)
    } else {
      console.log('⚠️  KAN Backend 응답 이상')
    }
  } catch (err) {
    console.log('❌ KAN Backend 연결 실패: ' + err.message)
  }
}

console.log('\n' + '='.repeat(60))
console.log('\n✅ 모든 설정 확인 완료!\n')
