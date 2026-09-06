import { describe, expect, it } from 'vitest';

import {
  getExecutableIndustryModule,
  getIndustryModule,
  isSelectableIndustry,
  resolveSystemPrompt,
  INDUSTRY_REGISTRY,
} from './registry';
import { getIndustryTerminology } from './terminology';

describe('INDUSTRY_REGISTRY', () => {
  it('registers all core industry modules with valid manifests', () => {
    const expectedModules = [
      'hospital_clinic',
      'coaching',
      'real_estate',
      'travel',
      'gym',
      'restaurant',
      'solo_teacher',
      'salon',
    ];
    for (const key of expectedModules) {
      const industryModule = INDUSTRY_REGISTRY[key];
      expect(industryModule).toBeDefined();
      expect(industryModule.id).toBe(key);
      expect(industryModule.name).toBeTruthy();
      expect(industryModule.sidebar.length).toBeGreaterThan(0);
      expect(industryModule.dashboardMetrics.length).toBeGreaterThan(0);
      expect(industryModule.systemPrompt).toBeTruthy();
      expect(industryModule.kbTemplates.length).toBeGreaterThan(0);
      expect(industryModule.campaignTemplates.length).toBeGreaterThan(0);
    }
  });

  it('correctly maps all industry aliases', () => {
    expect(getIndustryModule('health').id).toBe('hospital_clinic');
    expect(getIndustryModule('tutor').id).toBe('solo_teacher');
    expect(getIndustryModule('salon').id).toBe('salon');
    expect(getIndustryModule('spa').id).toBe('salon');
    expect(getIndustryModule('beauty').id).toBe('salon');
    expect(getIndustryModule('coaching').id).toBe('coaching');
    expect(getIndustryModule('real_estate').id).toBe('real_estate');
    expect(getIndustryModule('travel').id).toBe('travel');
    expect(getIndustryModule('gym').id).toBe('gym');
    expect(getIndustryModule('restaurant').id).toBe('restaurant');
    expect(getIndustryModule(null).id).toBe('general');
  });

  it('provides complete terminology for every registered industry', () => {
    const keys = Object.keys(getIndustryTerminology('general'));
    for (const industryModule of Object.values(INDUSTRY_REGISTRY)) {
      expect(industryModule.terminology).toBeDefined();
      for (const key of keys) {
        expect(
          industryModule.terminology?.[
            key as keyof NonNullable<typeof industryModule.terminology>
          ]
        ).toBeTruthy();
      }
    }
  });

  it('marks only released modules as selectable and executable', () => {
    expect(isSelectableIndustry('health')).toBe(true);
    expect(isSelectableIndustry('general')).toBe(true);
    expect(isSelectableIndustry('travel')).toBe(false);
    expect(isSelectableIndustry('coaching')).toBe(false);
    expect(getExecutableIndustryModule('travel').id).toBe('general');
    expect(getExecutableIndustryModule('health').id).toBe('hospital_clinic');
  });
});

describe('resolveSystemPrompt', () => {
  it('uses released workspace templates and adds the action contract', () => {
    const healthPrompt = resolveSystemPrompt('hospital_clinic', null);
    expect(healthPrompt).toContain(
      getIndustryModule('hospital_clinic').systemPrompt.trim()
    );
    expect(healthPrompt).toContain('[MANDATORY INTENT FULFILLMENT POLICY]');
    expect(healthPrompt).toContain('[HEALTHCARE BOOKING BEHAVIOR]');
  });

  it('falls back to general behavior for unreleased industries', () => {
    const travelPrompt = resolveSystemPrompt('travel', '');
    expect(travelPrompt).toContain(getIndustryModule('general').systemPrompt);
    expect(travelPrompt).not.toContain('[TRAVEL PACKAGE BEHAVIOR]');

    const salonPrompt = resolveSystemPrompt('salon', null);
    expect(salonPrompt).toContain(getIndustryModule('general').systemPrompt);
    expect(salonPrompt).not.toContain(
      getIndustryModule('salon').systemPrompt.trim()
    );
  });

  it('keeps a non-empty workspace prompt without activating its module', () => {
    const prompt = resolveSystemPrompt(
      'coaching',
      '  Reply as an admissions guide.  '
    );
    expect(prompt).toContain('Reply as an admissions guide.');
    expect(prompt).toContain('[MANDATORY INTENT FULFILLMENT POLICY]');
    expect(prompt).not.toContain('[EDUCATION ADMISSION BEHAVIOR]');
  });

  it('does not duplicate the mandatory policy', () => {
    const once = resolveSystemPrompt('hospital_clinic', null);
    const twice = resolveSystemPrompt('hospital_clinic', once);
    expect(twice).toBe(once);
    expect(
      twice.match(/\[MANDATORY INTENT FULFILLMENT POLICY\]/g)
    ).toHaveLength(1);
  });
});
