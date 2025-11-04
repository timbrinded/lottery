import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useParticipantTickets } from './useParticipantTickets';

describe('useParticipantTickets', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should save and retrieve ticket secret', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const lotteryId = 1n;
    const ticketIndex = 0;
    const ticketSecret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Save ticket
    act(() => {
      result.current.saveTicket(lotteryId, ticketIndex, ticketSecret);
    });

    // Retrieve ticket secret
    const retrievedSecret = result.current.getTicketSecret(lotteryId, ticketIndex);
    expect(retrievedSecret).toBe(ticketSecret);
  });

  it('should check if ticket exists', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const lotteryId = 1n;
    const ticketIndex = 0;
    const ticketSecret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Initially should not exist
    expect(result.current.hasTicket(lotteryId, ticketIndex)).toBe(false);

    // Save ticket
    act(() => {
      result.current.saveTicket(lotteryId, ticketIndex, ticketSecret);
    });

    // Now should exist
    expect(result.current.hasTicket(lotteryId, ticketIndex)).toBe(true);
  });

  it('should handle multiple tickets', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const ticket1 = {
      lotteryId: 1n,
      ticketIndex: 0,
      secret: '0x1111111111111111111111111111111111111111111111111111111111111111',
    };

    const ticket2 = {
      lotteryId: 1n,
      ticketIndex: 1,
      secret: '0x2222222222222222222222222222222222222222222222222222222222222222',
    };

    const ticket3 = {
      lotteryId: 2n,
      ticketIndex: 0,
      secret: '0x3333333333333333333333333333333333333333333333333333333333333333',
    };

    // Save multiple tickets
    act(() => {
      result.current.saveTicket(ticket1.lotteryId, ticket1.ticketIndex, ticket1.secret);
      result.current.saveTicket(ticket2.lotteryId, ticket2.ticketIndex, ticket2.secret);
      result.current.saveTicket(ticket3.lotteryId, ticket3.ticketIndex, ticket3.secret);
    });

    // Verify each ticket is stored separately
    expect(result.current.getTicketSecret(ticket1.lotteryId, ticket1.ticketIndex)).toBe(ticket1.secret);
    expect(result.current.getTicketSecret(ticket2.lotteryId, ticket2.ticketIndex)).toBe(ticket2.secret);
    expect(result.current.getTicketSecret(ticket3.lotteryId, ticket3.ticketIndex)).toBe(ticket3.secret);

    // Verify all tickets are returned
    const allTickets = result.current.getAllTickets();
    expect(allTickets).toHaveLength(3);
  });

  it('should remove ticket', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const lotteryId = 1n;
    const ticketIndex = 0;
    const ticketSecret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Save ticket
    act(() => {
      result.current.saveTicket(lotteryId, ticketIndex, ticketSecret);
    });

    expect(result.current.hasTicket(lotteryId, ticketIndex)).toBe(true);

    // Remove ticket
    act(() => {
      result.current.removeTicket(lotteryId, ticketIndex);
    });

    expect(result.current.hasTicket(lotteryId, ticketIndex)).toBe(false);
    expect(result.current.getTicketSecret(lotteryId, ticketIndex)).toBe(null);
  });

  it('should clear all tickets', () => {
    const { result } = renderHook(() => useParticipantTickets());

    // Save multiple tickets
    act(() => {
      result.current.saveTicket(1n, 0, '0x1111111111111111111111111111111111111111111111111111111111111111');
      result.current.saveTicket(1n, 1, '0x2222222222222222222222222222222222222222222222222222222222222222');
      result.current.saveTicket(2n, 0, '0x3333333333333333333333333333333333333333333333333333333333333333');
    });

    expect(result.current.getAllTickets()).toHaveLength(3);

    // Clear all
    act(() => {
      result.current.clearAllTickets();
    });

    expect(result.current.getAllTickets()).toHaveLength(0);
  });

  it('should return null for non-existent ticket', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const secret = result.current.getTicketSecret(999n, 999);
    expect(secret).toBe(null);
  });

  it('should persist across hook re-renders', () => {
    const { result, rerender } = renderHook(() => useParticipantTickets());

    const lotteryId = 1n;
    const ticketIndex = 0;
    const ticketSecret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Save ticket
    act(() => {
      result.current.saveTicket(lotteryId, ticketIndex, ticketSecret);
    });

    // Re-render hook
    rerender();

    // Should still have the ticket
    expect(result.current.getTicketSecret(lotteryId, ticketIndex)).toBe(ticketSecret);
  });

  it('should handle string and bigint lottery IDs', () => {
    const { result } = renderHook(() => useParticipantTickets());

    const ticketSecret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    // Save with bigint
    act(() => {
      result.current.saveTicket(1n, 0, ticketSecret);
    });

    // Retrieve with string
    expect(result.current.getTicketSecret('1', 0)).toBe(ticketSecret);

    // Retrieve with bigint
    expect(result.current.getTicketSecret(1n, 0)).toBe(ticketSecret);
  });
});
