import { NextResponse } from 'next/server';
import {
  createClient as createSupabaseServerClient,
  getAdminClient as getSupabaseAdminClient,
} from '@/lib/supabase/server';
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import {
  getExecutableIndustryModule,
  isSelectableIndustry,
  resolveCanonicalIndustry,
} from '@/modules/registry';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`signup_${ip}`, RATE_LIMITS.auth);
    if (!rateLimit.success) return rateLimitResponse(rateLimit);

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password =
      typeof body.password === 'string' ? body.password : '';
    const userName =
      typeof body.name === 'string'
        ? body.name
        : typeof body.fullName === 'string'
          ? body.fullName
          : '';
    const rawIndustry =
      typeof body.industry === 'string'
        ? body.industry
        : typeof body.businessType === 'string'
          ? body.businessType
          : '';
    const businessName =
      typeof body.businessName === 'string' ? body.businessName.trim() : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 8 characters long.',
        },
        { status: 400 }
      );
    }
    if (!rawIndustry || !isSelectableIndustry(rawIndustry)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select an available business type.',
        },
        { status: 400 }
      );
    }

    const canonicalIndustry = resolveCanonicalIndustry(rawIndustry);
    const trimmedEmail = email.toLowerCase();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { full_name: userName, industry: canonicalIndustry },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create account.' },
        { status: 400 }
      );
    }

    if (data?.user) {
      const admin = getSupabaseAdminClient();
      const userId = data.user.id;
      try {
        const { data: member, error: memberError } = await admin
          .from('account_members')
          .select('account_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (memberError) throw memberError;
        let accountId = member?.account_id;

        if (!accountId) {
          const { data: profile, error: profileError } = await admin
            .from('profiles')
            .select('account_id')
            .eq('user_id', userId)
            .maybeSingle();
          if (profileError) throw profileError;
          accountId = profile?.account_id;
        }

        if (!accountId) {
          const { data: account, error: accountError } = await admin
            .from('accounts')
            .select('id')
            .eq('owner_user_id', userId)
            .maybeSingle();
          if (accountError) throw accountError;
          accountId = account?.id;
        }

        if (accountId) {
          const moduleConfig = getExecutableIndustryModule(canonicalIndustry);
          const updatePayload: Record<string, unknown> = {
            industry: canonicalIndustry,
            updated_at: new Date().toISOString(),
          };
          if (businessName) updatePayload.name = businessName;
          if (moduleConfig.systemPrompt) {
            updatePayload.ai_system_prompt = moduleConfig.systemPrompt;
          }

          const { error: updateError } = await admin
            .from('accounts')
            .update(updatePayload)
            .eq('id', accountId);
          if (updateError) throw updateError;

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
          const nowIso = new Date().toISOString();
          const modulesToUpsert = allKnownModules.map((moduleKey) => ({
            account_id: accountId,
            module_key: moduleKey,
            enabled:
              moduleConfig.id === moduleKey &&
              isSelectableIndustry(moduleKey),
            settings: {},
            updated_at: nowIso,
          }));
          const { error: modulesError } = await admin
            .from('tenant_modules')
            .upsert(modulesToUpsert, {
              onConflict: 'account_id, module_key',
            });
          if (modulesError) throw modulesError;
        }
      } catch {
        console.error('[signup] Account provisioning sync failed');
        return NextResponse.json(
          {
            success: false,
            error: 'Account was created but provisioning is incomplete.',
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        success: true,
        redirect: '/dashboard',
        user: {
          id: data.user.id,
          email: data.user.email,
          name: userName,
          industry: canonicalIndustry,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to complete signup. Please try again.',
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Server error during account creation.' },
      { status: 500 }
    );
  }
}
