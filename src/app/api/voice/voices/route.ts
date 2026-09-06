import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { SARVAM_VOICES } from '@/core/providers/voice/sarvam-tts-provider';
import { DEFAULT_ELEVENLABS_VOICES } from '@/core/providers/voice/elevenlabs-tts-provider';

export async function GET() {
  try {
    await requireRole('viewer');

    return NextResponse.json({
      sarvamVoices: SARVAM_VOICES,
      elevenlabsVoices: DEFAULT_ELEVENLABS_VOICES,
      supportedLanguages: [
        { code: 'en-IN', name: 'English (India)' },
        { code: 'hi-IN', name: 'Hindi (हिंदी)' },
        { code: 'bn-IN', name: 'Bengali (বাংলা)' },
        { code: 'te-IN', name: 'Telugu (తెలుగు)' },
        { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
        { code: 'mr-IN', name: 'Marathi (मराठी)' },
        { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
        { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
        { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
        { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
        { code: 'od-IN', name: 'Odia (ଓଡ଼ିଆ)' },
      ],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
