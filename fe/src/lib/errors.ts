/**
 * Error handling utilities for contract interactions
 * Maps contract errors and wagmi errors to user-friendly messages
 */

/**
 * Contract error types from LotteryFactory
 */
export enum ContractError {
  CommitDeadlinePassed = 'CommitDeadlinePassed',
  CommitPeriodNotClosed = 'CommitPeriodNotClosed',
  RandomnessBlockNotReached = 'RandomnessBlockNotReached',
  BlockhashExpired = 'BlockhashExpired',
  BlockhashUnavailable = 'BlockhashUnavailable',
  InvalidCreatorSecret = 'InvalidCreatorSecret',
  TicketNotCommitted = 'TicketNotCommitted',
  TicketAlreadyRedeemed = 'TicketAlreadyRedeemed',
  TicketAlreadyCommitted = 'TicketAlreadyCommitted',
  InvalidTicketSecret = 'InvalidTicketSecret',
  InvalidTicketIndex = 'InvalidTicketIndex',
  ClaimDeadlinePassed = 'ClaimDeadlinePassed',
  InsufficientPrizePool = 'InsufficientPrizePool',
  UnauthorizedCaller = 'UnauthorizedCaller',
  InvalidPrizeSum = 'InvalidPrizeSum',
  InvalidDeadlines = 'InvalidDeadlines',
  InvalidArrayLengths = 'InvalidArrayLengths',
}

/**
 * User-friendly error messages for contract errors
 */
const CONTRACT_ERROR_MESSAGES: Record<ContractError, string> = {
  [ContractError.CommitDeadlinePassed]: 'Commit period has ended',
  [ContractError.CommitPeriodNotClosed]: 'Commit period must be closed before revealing',
  [ContractError.RandomnessBlockNotReached]: 'Please wait for randomness block to arrive',
  [ContractError.BlockhashExpired]: 'Reveal window expired, lottery can be refunded',
  [ContractError.BlockhashUnavailable]: 'Block hash unavailable, please try again',
  [ContractError.InvalidCreatorSecret]: 'Invalid creator secret',
  [ContractError.TicketNotCommitted]: 'You must commit before claiming',
  [ContractError.TicketAlreadyRedeemed]: 'Prize already claimed',
  [ContractError.TicketAlreadyCommitted]: 'This ticket has already been committed',
  [ContractError.InvalidTicketSecret]: 'Invalid ticket secret',
  [ContractError.InvalidTicketIndex]: 'Invalid ticket index',
  [ContractError.ClaimDeadlinePassed]: 'Claim deadline has passed',
  [ContractError.InsufficientPrizePool]: 'Insufficient prize pool',
  [ContractError.UnauthorizedCaller]: 'You are not authorized to perform this action',
  [ContractError.InvalidPrizeSum]: 'Prize sum must equal total amount',
  [ContractError.InvalidDeadlines]: 'Deadlines must be in correct order',
  [ContractError.InvalidArrayLengths]: 'Array lengths must match',
};

/**
 * Parse a contract error from an error message
 * @param errorMessage - The error message from the contract
 * @returns User-friendly error message
 */
export function parseContractError(errorMessage: string): string {
  // Check for each contract error type
  for (const [errorType, message] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (errorMessage.includes(errorType)) {
      return message;
    }
  }

  // Check for common wagmi/wallet errors
  if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
    return 'Transaction cancelled';
  }

  if (errorMessage.includes('insufficient funds') || errorMessage.includes('InsufficientFunds')) {
    return 'Insufficient ETH for transaction';
  }

  if (errorMessage.includes('network') || errorMessage.includes('Network')) {
    return 'Network error, please try again';
  }

  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error, please try again';
  }

  // Return original message if no match found
  return errorMessage;
}

/**
 * Get a user-friendly error message with additional context
 * @param error - The error object
 * @param context - Additional context (e.g., blocks remaining)
 * @returns Formatted error message
 */
export function getErrorMessage(error: Error | null, context?: { blocksRemaining?: number }): string {
  if (!error) return '';

  const baseMessage = parseContractError(error.message);

  // Add context for specific errors
  if (baseMessage.includes('randomness block') && context?.blocksRemaining !== undefined) {
    return `${baseMessage} (${context.blocksRemaining} blocks remaining)`;
  }

  return baseMessage;
}

/**
 * Check if an error is a user rejection
 * @param error - The error object
 * @returns true if user rejected the transaction
 */
export function isUserRejection(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return message.includes('user rejected') || message.includes('user denied');
}

/**
 * Check if an error is a network error
 * @param error - The error object
 * @returns true if it's a network error
 */
export function isNetworkError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return message.includes('network') || message.includes('connection');
}

/**
 * Format error for display in UI
 * @param error - The error object
 * @param context - Additional context
 * @returns Object with title and description for Alert/Toast
 */
export function formatErrorForDisplay(
  error: Error | null,
  context?: { blocksRemaining?: number }
): { title: string; description: string } {
  if (!error) {
    return { title: '', description: '' };
  }

  const message = getErrorMessage(error, context);

  // Determine title based on error type
  let title = 'Error';
  if (isUserRejection(error)) {
    title = 'Transaction Cancelled';
  } else if (isNetworkError(error)) {
    title = 'Network Error';
  } else if (message.includes('deadline') || message.includes('expired')) {
    title = 'Deadline Error';
  } else if (message.includes('Invalid')) {
    title = 'Validation Error';
  }

  return {
    title,
    description: message,
  };
}
