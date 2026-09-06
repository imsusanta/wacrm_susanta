import { ImageResponse } from 'next/og';

export const alt = 'Helpa — WhatsApp AI Receptionist & Patient Engagement CRM';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background:
          'linear-gradient(135deg, #020617 0%, #0F172A 50%, #022C22 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '80px',
        fontFamily: 'sans-serif',
        color: '#ffffff',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(37,211,102,0.25) 0%, rgba(37,211,102,0) 70%)',
        }}
      />

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffffff',
          }}
        >
          💬
        </div>
        <span
          style={{
            fontSize: '36px',
            fontWeight: 900,
            letterSpacing: '-0.03em',
          }}
        >
          helpa<span style={{ color: '#25D366' }}>.</span>studio
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '1000px',
        }}
      >
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: 0,
            color: '#FFFFFF',
          }}
        >
          A Calmer Clinic Front Desk on WhatsApp.
        </h1>
        <p
          style={{
            fontSize: '24px',
            lineHeight: 1.4,
            color: '#94A3B8',
            margin: 0,
            fontWeight: 500,
          }}
        >
          AI receptionist for patient FAQs, appointments, reminders, and staff
          handoff.
        </p>
      </div>

      {/* Footer info */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          fontSize: '18px',
          color: '#4ADE80',
          fontWeight: 700,
        }}
      >
        <span>✓ Official Meta Cloud API Partner</span>
        <span>•</span>
        <span>✓ 150+ Indian Businesses</span>
        <span>•</span>
        <span>✓ Instant 2s Replies</span>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
