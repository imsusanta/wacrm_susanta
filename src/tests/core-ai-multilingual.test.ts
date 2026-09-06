import { describe, expect, it } from 'vitest';
import { detectRegionalLanguage } from '@/core/ai/regional-language';

describe('Multi-Lingual AI Intelligence & Regional Language Detection', () => {
  it('detects Hindi in Devanagari script', () => {
    const res = detectRegionalLanguage(
      'नमस्ते डॉक्टर साहब, मुझे कल के लिए अपॉइंटमेंट चाहिए'
    );
    expect(res.code).toBe('hi');
    expect(res.script).toBe('Devanagari');
    expect(res.isRegionalIndian).toBe(true);
    expect(res.honorific).toContain('नमस्ते');
    expect(res.guidancePrompt).toContain('Devanagari');
  });

  it('detects Hinglish (Hindi written in Latin script)', () => {
    const res = detectRegionalLanguage(
      'bhaiya doctor appointment mil sakta hai kya kal'
    );
    expect(res.code).toBe('hinglish');
    expect(res.script).toBe('Latin');
    expect(res.isRegionalIndian).toBe(true);
    expect(res.guidancePrompt).toContain('Hinglish');
  });

  it('detects Bengali in Bangla script', () => {
    const res = detectRegionalLanguage(
      'নমস্কার, আমাকে ডক্টরের সাথে দেখা করতে হবে'
    );
    expect(res.code).toBe('bn');
    expect(res.script).toBe('Bengali');
    expect(res.isRegionalIndian).toBe(true);
    expect(res.honorific).toContain('নমস্কার');
    expect(res.guidancePrompt).toContain('Bengali');
  });

  it('detects Banglish (Bengali in Latin script)', () => {
    const res = detectRegionalLanguage(
      'apnader clinic ekhon open ache ki? kemon achen'
    );
    expect(res.code).toBe('banglish');
    expect(res.script).toBe('Latin');
    expect(res.isRegionalIndian).toBe(true);
    expect(res.guidancePrompt).toContain('Banglish');
  });

  it('detects Tamil in Tamil script', () => {
    const res = detectRegionalLanguage(
      'வணக்கம், எனக்கு மருத்துவரை பார்க்க வேண்டும்'
    );
    expect(res.code).toBe('ta');
    expect(res.script).toBe('Tamil');
    expect(res.isRegionalIndian).toBe(true);
    expect(res.honorific).toContain('வணக்கம்');
  });

  it('detects Tanglish (Tamil in Latin script)', () => {
    const res = detectRegionalLanguage(
      'vanakkam, ungalloda doctor appointment eppo kidaikkuma'
    );
    expect(res.code).toBe('tanglish');
    expect(res.script).toBe('Latin');
    expect(res.isRegionalIndian).toBe(true);
  });

  it('detects Telugu in Telugu script', () => {
    const res = detectRegionalLanguage('నమస్కారం, నాకు అపాయింట్‌మెంట్ కావాలి');
    expect(res.code).toBe('te');
    expect(res.script).toBe('Telugu');
    expect(res.isRegionalIndian).toBe(true);
  });

  it('detects Telugish (Telugu in Latin script)', () => {
    const res = detectRegionalLanguage(
      'namaskaram andi doctor appointment kavali'
    );
    expect(res.code).toBe('telugish');
    expect(res.script).toBe('Latin');
    expect(res.isRegionalIndian).toBe(true);
  });

  it('detects Gujarati in Gujarati script', () => {
    const res = detectRegionalLanguage(
      'નમસ્તે, ડોક્ટરની એપોઇન્ટમેન્ટ મળી શકે?'
    );
    expect(res.code).toBe('gu');
    expect(res.script).toBe('Gujarati');
    expect(res.isRegionalIndian).toBe(true);
  });

  it('detects standard English and does not flag as regional', () => {
    const res = detectRegionalLanguage(
      'Hello, I would like to book a dental checkup tomorrow morning.'
    );
    expect(res.code).toBe('en');
    expect(res.script).toBe('Latin');
    expect(res.isRegionalIndian).toBe(false);
  });
});
