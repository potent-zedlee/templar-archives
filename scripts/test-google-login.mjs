import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://diopilmkehygiqpizvga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3BpbG1rZWh5Z2lxcGl6dmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDE1MzcsImV4cCI6MjA3NTIxNzUzN30.HMeEKiipaJD0MQpYyyprBKgxT6bHB1cywpq__pSrkDU'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Google 로그인 URL 생성 테스트\n')

try {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://templar-archives.vercel.app/auth/callback',
      skipBrowserRedirect: true
    }
  })

  if (error) {
    console.log('❌ 에러 발생:', error.message)
    console.log('상세:', JSON.stringify(error, null, 2))
    
    if (error.message.includes('not configured') || error.message.includes('invalid client')) {
      console.log('\n⚠️  Google OAuth Client ID/Secret이 올바르게 설정되지 않았습니다.')
      console.log('\nSupabase Dashboard를 다시 확인해주세요:')
      console.log('https://supabase.com/dashboard/project/diopilmkehygiqpizvga/auth/providers')
    }
  } else if (data && data.url) {
    console.log('✅ Google 로그인 URL 생성 성공!\n')
    console.log('생성된 URL:')
    console.log(data.url)
    console.log('\n✅ Google OAuth가 정상적으로 설정되어 있습니다!')
    console.log('\n이 URL로 접속하면 Google 로그인 페이지로 이동합니다.')
    console.log('Client ID와 Secret이 올바르게 설정되어 있으면 로그인이 정상 작동합니다.')
  }
} catch (err) {
  console.log('❌ 예외 발생:', err.message)
}
