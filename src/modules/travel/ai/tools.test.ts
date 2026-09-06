import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiExecutionContext, AiToolDefinition } from '@/core/ai/types';
import { registerTourPackageTools } from './tools';

const booking = vi.hoisted(() => ({
  sendTravelBookingConfirmTemplate: vi.fn(),
  prepareTravelBookingConfirmOffer: vi.fn(),
  confirmPendingTravelBooking: vi.fn(),
  rememberDiscussedTourPackage: vi.fn(),
}));
vi.mock('@/lib/travel/booking-confirm', () => booking);

const context: AiExecutionContext = {
  accountId: 'tenant-a',
  userId: 'user-a',
  contactId: 'contact-a',
  conversationId: 'conversation-a',
  industry: 'travel',
};

function getTool(name: string): AiToolDefinition {
  const tools = new Map<string, AiToolDefinition>();
  registerTourPackageTools({
    get: (key) => tools.get(key),
    register: (tool) => {
      tools.set(tool.name, tool);
    },
  });
  return tools.get(name)!;
}

describe('Travel-owned booking tool executors', () => {
  beforeEach(() => {
    for (const mock of Object.values(booking)) mock.mockReset();
  });

  it('loads the booking adapter on execution and forwards the tenant context', async () => {
    const tool = getTool('offerTravelBookingConfirm');
    expect(booking.sendTravelBookingConfirmTemplate).not.toHaveBeenCalled();
    booking.sendTravelBookingConfirmTemplate.mockResolvedValue({
      packageName: 'Kashmir',
      travelDate: '2026-12-01',
    });
    const result = await tool.execute(
      { packageName: 'Kashmir', guestsCount: 2 },
      context
    );
    expect(booking.sendTravelBookingConfirmTemplate).toHaveBeenCalledWith({
      accountId: 'tenant-a',
      userId: 'user-a',
      contactId: 'contact-a',
      conversationId: 'conversation-a',
      packageName: 'Kashmir',
      guestsCount: 2,
      travelDate: undefined,
      totalPrice: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('preserves confirmation metadata and tenant context through both booking steps', async () => {
    const tool = getTool('confirmTravelBooking');
    expect(tool.requiresConfirmation).toBe(true);
    expect(tool.allowedIndustries).toEqual(['travel']);
    booking.prepareTravelBookingConfirmOffer.mockResolvedValue({});
    booking.confirmPendingTravelBooking.mockResolvedValue({
      status: 'confirmed',
      bookingId: 'booking-a',
      packageName: 'Kashmir',
    });
    const result = await tool.execute({ packageName: 'Kashmir' }, context);
    expect(booking.prepareTravelBookingConfirmOffer).toHaveBeenCalledWith({
      accountId: 'tenant-a',
      contactId: 'contact-a',
      conversationId: 'conversation-a',
      packageName: 'Kashmir',
    });
    expect(booking.confirmPendingTravelBooking).toHaveBeenCalledWith({
      accountId: 'tenant-a',
      contactId: 'contact-a',
      conversationId: 'conversation-a',
      userId: 'user-a',
    });
    expect(result).toEqual({
      success: true,
      data: {
        bookingId: 'booking-a',
        packageName: 'Kashmir',
        status: 'Confirmed',
      },
    });
  });

  it('keeps booking adapter failures behind the existing safe response', async () => {
    booking.sendTravelBookingConfirmTemplate.mockRejectedValue(
      new Error('internal failure')
    );
    const result = await getTool('offerTravelBookingConfirm').execute(
      {},
      context
    );
    expect(result).toEqual({
      success: false,
      error: 'Could not send the Booking Confirm template.',
    });
  });
});
