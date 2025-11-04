import { useLocalStorage } from 'usehooks-ts';

/**
 * Storage structure for participant ticket data
 * Stores ticket secrets for claiming prizes later
 */
interface ParticipantTicketData {
  lotteryId: string;
  ticketIndex: number;
  ticketSecret: string;
  savedAt: number;
}

type ParticipantTicketsMap = Record<string, ParticipantTicketData>;

/**
 * Hook for managing participant ticket secrets in local storage
 * Automatically saves ticket codes when users view them, so they don't need to re-enter when claiming
 */
export function useParticipantTickets() {
  const [tickets, setTickets] = useLocalStorage<ParticipantTicketsMap>(
    'participant-tickets',
    {}
  );

  /**
   * Generate storage key for a ticket
   */
  const getTicketKey = (lotteryId: bigint | string, ticketIndex: number): string => {
    return `${lotteryId.toString()}_${ticketIndex}`;
  };

  /**
   * Save a ticket's secret for later claiming
   */
  const saveTicket = (
    lotteryId: bigint | string,
    ticketIndex: number,
    ticketSecret: string
  ) => {
    const key = getTicketKey(lotteryId, ticketIndex);
    setTickets((prev) => ({
      ...prev,
      [key]: {
        lotteryId: lotteryId.toString(),
        ticketIndex,
        ticketSecret,
        savedAt: Date.now(),
      },
    }));
  };

  /**
   * Get a ticket's secret
   */
  const getTicket = (
    lotteryId: bigint | string,
    ticketIndex: number
  ): ParticipantTicketData | null => {
    const key = getTicketKey(lotteryId, ticketIndex);
    return tickets[key] || null;
  };

  /**
   * Get the secret for a specific ticket
   */
  const getTicketSecret = (
    lotteryId: bigint | string,
    ticketIndex: number
  ): string | null => {
    const ticket = getTicket(lotteryId, ticketIndex);
    return ticket?.ticketSecret || null;
  };

  /**
   * Check if a ticket is saved
   */
  const hasTicket = (lotteryId: bigint | string, ticketIndex: number): boolean => {
    const key = getTicketKey(lotteryId, ticketIndex);
    return key in tickets;
  };

  /**
   * Remove a ticket (e.g., after claiming)
   */
  const removeTicket = (lotteryId: bigint | string, ticketIndex: number) => {
    const key = getTicketKey(lotteryId, ticketIndex);
    setTickets((prev) => {
      const newTickets = { ...prev };
      delete newTickets[key];
      return newTickets;
    });
  };

  /**
   * Get all saved tickets
   */
  const getAllTickets = (): ParticipantTicketData[] => {
    return Object.values(tickets);
  };

  /**
   * Clear all saved tickets
   */
  const clearAllTickets = () => {
    setTickets({});
  };

  return {
    saveTicket,
    getTicket,
    getTicketSecret,
    hasTicket,
    removeTicket,
    getAllTickets,
    clearAllTickets,
    tickets,
  };
}
