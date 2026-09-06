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
      {/* Decorative elements */}
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

      {/* Top Header / Brand Badge */}
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
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
          }}
        >
          💬
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
        <div
          style={{
            marginLeft: '24px',
            background: 'rgba(37, 211, 102, 0.15)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            borderRadius: '9999px',
            padding: '6px 18px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#4ADE80',
          }}
        >
          Official Meta WhatsApp Cloud API
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
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
          Never Miss Another{' '}
          <span
            style={{
              color: '#25D366',
              background: 'linear-gradient(90deg, #25D366, #34D399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            WhatsApp Customer.
          </span>
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
          WhatsApp AI receptionist for independent clinics. Answer approved
          patient FAQs, coordinate appointments, send reminders, and hand off to
          staff.
        </p>
      </div>

      {/* Bottom Feature Badges */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '18px',
            fontWeight: 600,
            color: '#E2E8F0',
          }}
        >
          ⚡ 24/7 Patient Replies
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '18px',
            fontWeight: 600,
            color: '#E2E8F0',
          }}
        >
          📅 Auto Slot Booking
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '18px',
            fontWeight: 600,
            color: '#E2E8F0',
          }}
        >
          🔒 Privacy Controls
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
