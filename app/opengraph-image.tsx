import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Templar Archives'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '160px',
            height: '160px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '32px',
            fontSize: '80px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '40px',
          }}
        >
          TA
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Templar Archives
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: '#a8b3cf',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          Poker Hand History Archive & Analysis Platform
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            marginTop: '60px',
            gap: '60px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#667eea' }}>
              10,000+
            </div>
            <div style={{ fontSize: '20px', color: '#8b95a9' }}>
              Hands Archived
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#667eea' }}>
              50+
            </div>
            <div style={{ fontSize: '20px', color: '#8b95a9' }}>
              Tournaments
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#667eea' }}>
              AI
            </div>
            <div style={{ fontSize: '20px', color: '#8b95a9' }}>
              Powered Search
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
