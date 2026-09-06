import { describe, expect, it } from 'vitest';
import {
  getExecutableIndustryModule,
  getIndustryModule,
  isSelectableIndustry,
} from '@/modules/registry';
import { getIndustryTerminology } from '@/modules/terminology';

describe('Phase 2: Dynamic Industry Workspace Manifests', () => {
  const supportedIndustries = [
    'health',
    'coaching',
    'tutor',
    'salon',
    'real_estate',
  ];

  it('resolves manifests for active and future industries', () => {
    for (const industry of supportedIndustries) {
      const manifest = getIndustryModule(industry);
      expect(manifest.id).toBeTruthy();
      expect(manifest.name).toBeTruthy();
      expect(['ACTIVE', 'COMING_SOON']).toContain(manifest.status);
      expect(manifest.terminology).toBeDefined();
      expect(manifest.allowedRoutes).toBeDefined();
    }
  });

  it('marks health as active and future industries as unavailable', () => {
    expect(getIndustryModule('health').status).toBe('ACTIVE');
    expect(getIndustryModule('coaching').status).toBe('COMING_SOON');
    expect(getIndustryModule('tutor').status).toBe('COMING_SOON');
    expect(getIndustryModule('salon').status).toBe('COMING_SOON');
    expect(getIndustryModule('real_estate').status).toBe('COMING_SOON');
    expect(isSelectableIndustry('health')).toBe(true);
    expect(isSelectableIndustry('general')).toBe(true);
    expect(isSelectableIndustry('travel')).toBe(false);
    expect(getExecutableIndustryModule('travel').id).toBe('general');
  });

  it('resolves correct industry-specific terminology', () => {
    const health = getIndustryTerminology('health');
    expect(health.contact).toBe('Patient');
    expect(health.booking).toBe('Appointment');
    expect(health.staff).toBe('Doctor');

    const coaching = getIndustryTerminology('coaching');
    expect(coaching.contact).toBe('Student');
    expect(coaching.booking).toBe('Admission Enquiry');

    const tutor = getIndustryTerminology('tutor');
    expect(tutor.booking).toBe('Class Booking');

    const salon = getIndustryTerminology('salon');
    expect(salon.contact).toBe('Client');

    const realEstate = getIndustryTerminology('real_estate');
    expect(realEstate.contact).toBe('Lead');
    expect(realEstate.meeting).toBe('Site Visit');
  });

  it('gracefully handles missing or unknown industry keys', () => {
    expect(getIndustryModule('unknown_industry_xyz').id).toBe('general');
    expect(getIndustryModule(null).id).toBe('general');
    expect(getIndustryModule('general').name).toBe('General CRM');
  });

  describe('Business Type Canonical Selection & Server Validation', () => {
    it('offers only released business types', async () => {
      const { BUSINESS_TYPE_OPTIONS } = await import('@/modules/registry');
      expect(BUSINESS_TYPE_OPTIONS.map((option) => option.id)).toEqual([
        'hospital_clinic',
        'general',
      ]);
    });

    it('resolves aliases while independently checking availability', async () => {
      const { isValidIndustry, resolveCanonicalIndustry } = await import(
        '@/modules/registry'
      );
      expect(resolveCanonicalIndustry('health')).toBe('hospital_clinic');
      expect(resolveCanonicalIndustry('education')).toBe('coaching');
      expect(resolveCanonicalIndustry('other')).toBe('general');
      expect(isValidIndustry('travel')).toBe(true);
      expect(isSelectableIndustry('travel')).toBe(false);
      expect(isSelectableIndustry('health')).toBe(true);
      expect(isSelectableIndustry('other')).toBe(true);
      expect(isValidIndustry('crypto_trading')).toBe(false);
    });
  });
});
