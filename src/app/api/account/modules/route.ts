import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import {
  getIndustryModule,
  isSelectableIndustry,
  resolveCanonicalIndustry,
} from '@/modules/registry';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.admin
      .from('tenant_modules')
      .select('module_key, enabled, settings')
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[GET /api/account/modules] Module lookup failed');
      return NextResponse.json(
        { error: 'Failed to load tenant modules' },
        { status: 500 }
      );
    }

    const modules = (data || []).map((row) => ({
      ...row,
      enabled:
        row.enabled === true && isSelectableIndustry(String(row.module_key)),
    }));
    return NextResponse.json({ modules });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = (await request.json().catch(() => null)) as {
      module_key?: unknown;
      enabled?: unknown;
      settings?: unknown;
    } | null;
    const requestedKey =
      typeof body?.module_key === 'string' ? body.module_key.trim() : '';
    if (!requestedKey) {
      return NextResponse.json(
        { error: 'module_key parameter is required' },
        { status: 400 }
      );
    }
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    const moduleKey = resolveCanonicalIndustry(requestedKey);
    const moduleConfig = getIndustryModule(moduleKey);
    if (
      moduleConfig.id === 'general' ||
      moduleConfig.id !== moduleKey ||
      !isSelectableIndustry(moduleKey)
    ) {
      return NextResponse.json(
        { error: 'This module is not available' },
        { status: 409 }
      );
    }

    const settings = body?.settings ?? {};
    if (
      !settings ||
      typeof settings !== 'object' ||
      Array.isArray(settings)
    ) {
      return NextResponse.json(
        { error: 'settings must be an object' },
        { status: 400 }
      );
    }

    const { data, error } = await ctx.admin
      .from('tenant_modules')
      .upsert(
        {
          account_id: ctx.accountId,
          module_key: moduleKey,
          enabled: body.enabled,
          settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id, module_key' }
      )
      .select()
      .single();

    if (error) {
      console.error('[POST /api/account/modules] Module update failed');
      return NextResponse.json(
        { error: 'Failed to update tenant module' },
        { status: 500 }
      );
    }

    return NextResponse.json({ module: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
