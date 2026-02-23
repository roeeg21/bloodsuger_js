import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d1117',
          borderRadius: 96,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 25% 20%, rgba(34,197,94,0.22), transparent 45%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 80% 85%, rgba(250,204,21,0.14), transparent 45%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 22,
            borderRadius: 80,
            border: '2px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            color: 'white',
          }}
        >
          <div
            style={{
              width: 280,
              height: 120,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
              <path
                d="M10 74 H58 L78 42 L102 86 L126 58 H156 L176 28 L198 72 H270"
                stroke="#22C55E"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 74 H58 L78 42 L102 86 L126 58 H156 L176 28 L198 72 H270"
                stroke="rgba(34,197,94,0.3)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              letterSpacing: -1,
            }}
          >
            <span
              style={{
                fontSize: 58,
                fontWeight: 800,
                color: '#22C55E',
                textShadow: '0 0 24px rgba(34,197,94,0.35)',
              }}
            >
              BG
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.88)',
              }}
            >
              APP
            </span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
