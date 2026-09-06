/**
 * Helpa Core Platform — Multi-Lingual Regional Language Intelligence
 *
 * Provides native Unicode script detection and transliterated dialect recognition
 * for Indian regional markets (Hindi, Bengali, Tamil, Telugu, Gujarati, Marathi,
 * Kannada, Malayalam, Punjabi, Hinglish, Banglish, Tanglish, Telugish).
 */

export interface DetectedLanguage {
  code:
    | 'hi'
    | 'bn'
    | 'ta'
    | 'te'
    | 'gu'
    | 'mr'
    | 'kn'
    | 'ml'
    | 'pa'
    | 'hinglish'
    | 'banglish'
    | 'tanglish'
    | 'telugish'
    | 'en'
    | 'other';
  name: string;
  script: string;
  isRegionalIndian: boolean;
  confidence: number;
  honorific?: string;
  guidancePrompt: string;
}

// Unicode Script Regex Patterns
const SCRIPT_PATTERNS = [
  {
    code: 'bn' as const,
    name: 'Bengali (বাংলা)',
    script: 'Bengali',
    regex: /[\u0980-\u09FF]/g,
    honorific: 'নমস্কার / আপনি',
  },
  {
    code: 'hi' as const,
    name: 'Hindi (Devanagari)',
    script: 'Devanagari',
    regex: /[\u0900-\u097F]/g,
    honorific: 'नमस्ते / जी',
  },
  {
    code: 'ta' as const,
    name: 'Tamil (தமிழ்)',
    script: 'Tamil',
    regex: /[\u0B80-\u0BFF]/g,
    honorific: 'வணக்கம் (Vanakkam)',
  },
  {
    code: 'te' as const,
    name: 'Telugu (తెలుగు)',
    script: 'Telugu',
    regex: /[\u0C00-\u0C7F]/g,
    honorific: 'నమస్కారం / గారు (Garu)',
  },
  {
    code: 'gu' as const,
    name: 'Gujarati (ગુજરાતી)',
    script: 'Gujarati',
    regex: /[\u0A80-\u0AFF]/g,
    honorific: 'નમસ્તે',
  },
  {
    code: 'kn' as const,
    name: 'Kannada (ಕನ್ನಡ)',
    script: 'Kannada',
    regex: /[\u0C80-\u0CFF]/g,
    honorific: 'ನಮಸ್ಕಾರ (Namaskara)',
  },
  {
    code: 'ml' as const,
    name: 'Malayalam (മലയാളം)',
    script: 'Malayalam',
    regex: /[\u0D00-\u0D7F]/g,
    honorific: 'നമസ്കാരം (Namaskaram)',
  },
  {
    code: 'pa' as const,
    name: 'Punjabi (ਪੰਜਾਬੀ)',
    script: 'Gurmukhi',
    regex: /[\u0A00-\u0A7F]/g,
    honorific: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ (Sat Sri Akal)',
  },
];

// Transliterated / Romanized Indian Language Marker Tokens
const HINGLISH_TOKENS = new Set([
  'kya',
  'hai',
  'hain',
  'hoga',
  'hogi',
  'chahiye',
  'bhai',
  'bhaiya',
  'aap',
  'aapka',
  'aapki',
  'hum',
  'nahi',
  'aaj',
  'kal',
  'shukriya',
  'kripya',
  'dhanyawad',
  'kaise',
  'kitna',
  'karo',
  'karna',
  'kijiye',
  'bataye',
  'batayein',
  'kab',
  'mil',
  'sakta',
  'sakte',
  'theek',
  'namaste',
  'dhanyavad',
  'bolo',
  'milna',
  'milega',
  'dena',
  'lelo',
]);

const BANGLISH_TOKENS = new Set([
  'kemon',
  'achen',
  'acho',
  'apnar',
  'apnader',
  'dhonnobad',
  'hobe',
  'ekhon',
  'khub',
  'bhalo',
  'shob',
  'korte',
  'parbo',
  'parben',
  'janan',
  'bolun',
  'koto',
  'taka',
  'daaktar',
  'dekha',
  'dekhte',
  'chai',
  'shomoy',
  'kobe',
  'ashbo',
  'khola',
  'ache',
  'thakbe',
  'nomoshkar',
]);

const TANGLISH_TOKENS = new Set([
  'vanakkam',
  'eppadi',
  'irukinga',
  'irukeenga',
  'nandri',
  'romba',
  'pannunga',
  'sollunga',
  'illai',
  'illa',
  'venum',
  'theriyum',
  'eppo',
  'varalam',
  'neram',
  'kidaikkuma',
  'paakanum',
  'ungalukku',
  'ungalloda',
  'enakku',
]);

const TELUGISH_TOKENS = new Set([
  'namaskaram',
  'ela',
  'unnaru',
  'cheyandi',
  'kavali',
  'enti',
  'andi',
  'ledu',
  'dhanyavadalu',
  'eppudu',
  'vastaru',
  'chudali',
  'meeru',
  'kudaradu',
  'unnara',
  'samayam',
  'dabbulu',
]);

/**
 * Detects whether the input message is in an Indian script or Romanized Indian dialect.
 */
export function detectRegionalLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      code: 'en',
      name: 'English',
      script: 'Latin',
      isRegionalIndian: false,
      confidence: 1.0,
      guidancePrompt: 'Respond in polite, professional English.',
    };
  }

  // 1. Script-based detection (Devanagari, Bengali, Tamil, Telugu, etc.)
  for (const item of SCRIPT_PATTERNS) {
    const matches = trimmed.match(item.regex);
    if (matches && matches.length >= 2) {
      const matchRatio = matches.length / trimmed.replace(/\s+/g, '').length;
      if (matchRatio > 0.15 || matches.length >= 4) {
        return {
          code: item.code,
          name: item.name,
          script: item.script,
          isRegionalIndian: true,
          confidence: Math.min(1.0, 0.6 + matchRatio),
          honorific: item.honorific,
          guidancePrompt: `CRITICAL LANGUAGE REQUIREMENT: The customer wrote in ${item.name} (${item.script} script).
You MUST respond strictly in ${item.script} script.
Do NOT switch to English or Latin transliteration.
Maintain regional politeness and respect (${item.honorific}).
Keep facts grounded exclusively in the business knowledge base.`,
        };
      }
    }
  }

  // 2. Romanized / Transliterated Indian dialect detection
  const words = trimmed
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length > 0) {
    let hinglishHits = 0;
    let banglishHits = 0;
    let tanglishHits = 0;
    let telugishHits = 0;

    for (const w of words) {
      if (HINGLISH_TOKENS.has(w)) hinglishHits++;
      if (BANGLISH_TOKENS.has(w)) banglishHits++;
      if (TANGLISH_TOKENS.has(w)) tanglishHits++;
      if (TELUGISH_TOKENS.has(w)) telugishHits++;
    }

    const totalWords = words.length;

    const candidates = [
      {
        code: 'hinglish' as const,
        name: 'Hinglish (Hindi in Latin script)',
        script: 'Latin',
        isRegionalIndian: true,
        hits: hinglishHits,
        confidence: Math.min(1.0, 0.5 + hinglishHits / totalWords),
        honorific: 'जी (Ji)',
        guidancePrompt: `CRITICAL LANGUAGE REQUIREMENT: The customer wrote in Hinglish (Hindi using the Latin/English alphabet).
You MUST reply in conversational, friendly Hinglish (Hindi written using the Latin English alphabet).
Do NOT reply in Devanagari script. Do NOT reply in formal Oxford English.
Use common Indian conversational warmth (e.g., 'Haan ji', 'Aapka appointment confirm kar diya gaya hai', 'Koi aur sawal ho toh batayein').
Keep all business facts and prices accurate.`,
      },
      {
        code: 'banglish' as const,
        name: 'Banglish (Bengali in Latin script)',
        script: 'Latin',
        isRegionalIndian: true,
        hits: banglishHits,
        confidence: Math.min(1.0, 0.5 + banglishHits / totalWords),
        honorific: 'আপনি (Apni)',
        guidancePrompt: `CRITICAL LANGUAGE REQUIREMENT: The customer wrote in Banglish (Bengali using the Latin/English alphabet).
You MUST reply in natural, polite Banglish (Bengali in English script).
Do NOT reply in Bengali script and do NOT revert to formal English.
Use polite Bengali phrasing (e.g. 'Apnar appointment confirm hoye geche', 'Ar kono jankari lagle bolun').`,
      },
      {
        code: 'tanglish' as const,
        name: 'Tanglish (Tamil in Latin script)',
        script: 'Latin',
        isRegionalIndian: true,
        hits: tanglishHits,
        confidence: Math.min(1.0, 0.5 + tanglishHits / totalWords),
        honorific: 'Vanakkam',
        guidancePrompt: `CRITICAL LANGUAGE REQUIREMENT: The customer wrote in Tanglish (Tamil using Latin alphabet).
You MUST reply in natural, friendly Tanglish (e.g. 'Vanakkam, ungalloda appointment confirm panniyachu').
Do NOT switch to standard English.`,
      },
      {
        code: 'telugish' as const,
        name: 'Telugish (Telugu in Latin script)',
        script: 'Latin',
        isRegionalIndian: true,
        hits: telugishHits,
        confidence: Math.min(1.0, 0.5 + telugishHits / totalWords),
        honorific: 'Garu',
        guidancePrompt: `CRITICAL LANGUAGE REQUIREMENT: The customer wrote in Telugish (Telugu using Latin alphabet).
You MUST reply in natural, friendly Telugish (e.g. 'Namaskaram andi, mee appointment confirm aindi').
Do NOT switch to standard English.`,
      },
    ];

    candidates.sort((a, b) => b.hits - a.hits);
    const best = candidates[0];

    if (best.hits >= 2 || (best.hits >= 1 && totalWords <= 5)) {
      return {
        code: best.code,
        name: best.name,
        script: best.script,
        isRegionalIndian: best.isRegionalIndian,
        confidence: best.confidence,
        honorific: best.honorific,
        guidancePrompt: best.guidancePrompt,
      };
    }
  }

  // 3. Default to English / Latin
  return {
    code: 'en',
    name: 'English',
    script: 'Latin',
    isRegionalIndian: false,
    confidence: 0.9,
    guidancePrompt: 'Respond in polite, concise, professional English.',
  };
}
