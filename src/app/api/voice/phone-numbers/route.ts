import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';

export async function GET() {
  try {
    const ctx = await requireRole('viewer');
    const db = getAdminClient();

    const { data: phoneNumbers, error } = await db
      .from('calling_phone_numbers')
      .select('*, calling_agents(id, name)')
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ phoneNumbers: phoneNumbers || [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const db = getAdminClient();

    const body = await request.json();
    const {
      phone_number,
      provider = 'elevenlabs',
      provider_phone_number_id,
      assigned_agent_id,
      inbound_enabled = true,
      outbound_enabled = true,
      status = 'active',
    } = body;

    if (!phone_number || typeof phone_number !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_PHONE_NUMBER', message: 'Phone number is required' },
        { status: 400 }
      );
    }

    const cleanPhone = phone_number.trim();

    const { data: created, error } = await db
      .from('calling_phone_numbers')
      .insert({
        account_id: ctx.accountId,
        phone_number: cleanPhone,
        provider,
        provider_phone_number_id: provider_phone_number_id || null,
        assigned_agent_id: assigned_agent_id || null,
        inbound_enabled: Boolean(inbound_enabled),
        outbound_enabled: Boolean(outbound_enabled),
        status,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ phoneNumber: created }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const db = getAdminClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'MISSING_ID', message: 'Phone number ID is required' },
        { status: 400 }
      );
    }

    const { error } = await db
      .from('calling_phone_numbers')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
