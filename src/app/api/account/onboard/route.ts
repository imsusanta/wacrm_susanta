import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient as getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  flattenStepsTree,
  type BuilderStepInput,
} from '@/lib/automations/steps-tree';
import {
  getExecutableIndustryModule,
  isSelectableIndustry,
  resolveCanonicalIndustry,
} from '@/modules/registry';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      industry,
      reset,
      reconfigure,
      name: workspaceName,
      logo,
      location,
      city,
      workingDays,
      openingTime,
      closingTime,
      welcomeMessage,
      services,
      timezone: _timezone,
      country: _country,
    } = body || {};

    const isMaintenanceOp = Boolean(reset || reconfigure);
    const ctx = await requireRole(isMaintenanceOp ? 'admin' : 'owner');
    const admin = getSupabaseAdminClient();

    if (reset) {
      const { error: accountError } = await admin
        .from('accounts')
        .update({
          industry: 'general',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ctx.accountId);
      if (accountError) throw new Error('Failed to reset workspace');

      const { data: seededAutomations, error: seededError } = await admin
        .from('automations')
        .select('id, metadata')
        .eq('account_id', ctx.accountId);
      if (seededError) throw new Error('Failed to load seeded workflows');
      const seededIds = (seededAutomations ?? [])
        .filter(
          (automation) =>
            (automation.metadata as Record<string, unknown> | null)
              ?.helpa_seeded_workflow === true
        )
        .map((automation) => automation.id);
      if (seededIds.length > 0) {
        const { error: stepsError } = await admin
          .from('automation_steps')
          .delete()
          .in('automation_id', seededIds);
        if (stepsError) throw new Error('Failed to remove seeded steps');
        const { error: workflowsError } = await admin
          .from('automations')
          .delete()
          .eq('account_id', ctx.accountId)
          .in('id', seededIds);
        if (workflowsError) throw new Error('Failed to remove seeded workflows');
      }
      return NextResponse.json({ success: true, reset: true });
    }

    if (!industry || typeof industry !== 'string') {
      return NextResponse.json(
        { error: 'Industry selection is required.' },
        { status: 400 }
      );
    }
    if (!isSelectableIndustry(industry)) {
      return NextResponse.json(
        { error: 'Please select an available business type.' },
        { status: 400 }
      );
    }

    const validIndustryId = resolveCanonicalIndustry(industry);
    const config = getExecutableIndustryModule(validIndustryId);
    const effectiveLocation = location || city || '';
    let tailoredPrompt = config.systemPrompt;
    if (effectiveLocation || (openingTime && closingTime)) {
      const hoursText =
        openingTime && closingTime
          ? `${workingDays || 'Monday - Saturday'}: ${openingTime} to ${closingTime}`
          : 'Standard operating hours';
      const locationText = effectiveLocation
        ? `Location / City: ${effectiveLocation}`
        : '';
      tailoredPrompt = `${tailoredPrompt}\n\nBUSINESS PROFILE & OPERATING HOURS:\nBusiness Name: ${workspaceName || 'Our Business'}\n${locationText}\nOperating Hours: ${hoursText}\nAlways quote official prices accurately and direct customers politely.`;
    }

    const allKnownModules = [
      'hospital_clinic',
      'real_estate',
      'travel',
      'coaching',
      'restaurant',
      'gym',
      'solo_teacher',
      'salon',
    ];
    const kbItems: Array<{
      category: 'faq' | 'service' | 'pricing' | 'policy' | 'company';
      question_title: string;
      answer_content: string;
    }> = [];

    if (effectiveLocation || (openingTime && closingTime)) {
      kbItems.push({
        category: 'company',
        question_title:
          'Where are you located and what are your business hours?',
        answer_content: `We are located at ${effectiveLocation || 'our main location'}. Our working hours are ${workingDays || 'Monday to Saturday'} from ${openingTime || '9:00 AM'} to ${closingTime || '8:00 PM'}.`,
      });
    }

    if (Array.isArray(services) && services.length > 0) {
      for (const service of services) {
        if (service?.name && service?.price !== undefined) {
          const price = `₹${Number(service.price).toLocaleString()}`;
          const description = service.description
            ? ` Details: ${service.description}`
            : '';
          kbItems.push({
            category: 'pricing',
            question_title: `How much does ${service.name} cost?`,
            answer_content: `The price for ${service.name} is ${price}.${description}`,
          });
          kbItems.push({
            category: 'service',
            question_title: `Do you provide ${service.name}?`,
            answer_content: `Yes! We offer ${service.name} at ${price}.${description}`,
          });
        }
      }
    }

    for (const template of config.kbTemplates || []) {
      kbItems.push({
        category: template.category,
        question_title: template.questionTitle,
        answer_content: template.answerContent,
      });
    }

    const campaigns = (config.campaignTemplates || []).map((campaign) => ({
      name: campaign.name,
      category: campaign.category,
      message_body: campaign.messageBody,
      cta_type: campaign.ctaType || 'none',
      cta_text: campaign.ctaText || null,
      cta_url: campaign.ctaUrl || null,
      attachment_url: campaign.attachmentUrl || null,
      attachment_type: campaign.attachmentType || null,
    }));
    const workflows = (config.workflows || []).map((workflow) => ({
      name: workflow.name,
      description: workflow.description || '',
      trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config || {},
      is_active: Boolean(workflow.is_active),
      seed_key: workflow.seedKey || '',
      steps: flattenStepsTree(
        (workflow.steps || []) as unknown as BuilderStepInput[]
      ).map((step) => ({
        id: step.id,
        parent_step_id: step.parent_step_id,
        branch: step.branch,
        step_type: step.step_type,
        step_config: step.step_config || {},
        position: step.position,
      })),
    }));

    const { data: rpcResult, error: rpcError } = await admin.rpc(
      'complete_workspace_onboarding',
      {
        p_account_id: ctx.accountId,
        p_user_id: ctx.userId,
        p_industry: validIndustryId,
        p_workspace_name: workspaceName || null,
        p_logo: logo || null,
        p_ai_system_prompt: tailoredPrompt,
        p_welcome_message: welcomeMessage || null,
        p_all_known_modules: allKnownModules,
        p_pipeline_stages: config.pipelineStages || [],
        p_kb_items: kbItems,
        p_campaigns: campaigns,
        p_workflows: workflows,
        p_reconfigure: Boolean(reconfigure),
      }
    );

    if (rpcError) {
      console.error('[onboard route] Atomic onboarding failed');
      return NextResponse.json(
        { error: 'Failed to complete workspace onboarding' },
        { status: 500 }
      );
    }

    return NextResponse.json({ industry: validIndustryId, ...rpcResult });
  } catch (error) {
    return toErrorResponse(error);
  }
}
