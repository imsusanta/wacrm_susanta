import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/supabase/server';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export async function GET() {
  try {
    const context = await requireRole('viewer');
    const { accountId } = context;
    const db = getAdminClient();

    // 1. Fetch full account row for profile and AI prompt checks
    const { data: account, error: accountError } = await db
      .from('accounts')
      .select('name, industry, ai_system_prompt')
      .eq('id', accountId)
      .maybeSingle();

    if (accountError) {
      console.warn(
        '[checklist-status] Error fetching account:',
        accountError.message
      );
    }

    const accountName = account?.name || context.account.name || '';
    const accountIndustry = account?.industry || context.account.industry || '';
    const aiSystemPrompt = account?.ai_system_prompt || '';

    const profileDone = Boolean(
      accountName && accountIndustry && accountIndustry !== 'general'
    );
    const aiDone = Boolean(aiSystemPrompt.trim().length > 10);

    // 2. Query knowledge_base entries count
    const { count: kbCount, error: kbError } = await db
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId);

    if (kbError) {
      console.warn(
        '[checklist-status] Error counting knowledge_base:',
        kbError.message
      );
    }

    const servicesCount = kbCount ?? 0;
    const servicesDone = servicesCount > 0;

    // 3. Query WhatsApp connection state
    let whatsappDone = false;
    const { data: waConfig } = await db
      .from('whatsapp_configs')
      .select('id, phone_number_id, is_active')
      .eq('account_id', accountId)
      .maybeSingle();

    if (waConfig) {
      whatsappDone = Boolean(
        waConfig.phone_number_id || waConfig.is_active !== false
      );
    } else {
      const { data: legacyConf } = await db
        .from('whatsapp_config')
        .select('id, phone_number_id')
        .eq('account_id', accountId)
        .maybeSingle();
      if (legacyConf) {
        whatsappDone = Boolean(legacyConf.phone_number_id);
      }
    }

    const items = [
      {
        id: 'profile',
        label: 'Business Profile configured',
        done: profileDone,
        href: '/settings',
      },
      {
        id: 'services',
        label: 'Services & Pricing saved',
        done: servicesDone,
        count: servicesCount,
        href: '/knowledge-base',
      },
      {
        id: 'ai',
        label: 'AI Receptionist configured',
        done: aiDone,
        href: '/settings/ai',
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp connected',
        done: whatsappDone,
        href: '/settings/whatsapp',
      },
    ];

    const completedCount = items.filter((item) => item.done).length;
    const totalCount = items.length;
    const percent = Math.round((completedCount / totalCount) * 100);

    return NextResponse.json(
      {
        profile_done: profileDone,
        services_done: servicesDone,
        services_count: servicesCount,
        ai_done: aiDone,
        whatsapp_done: whatsappDone,
        items,
        completed_count: completedCount,
        total_count: totalCount,
        percent,
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
