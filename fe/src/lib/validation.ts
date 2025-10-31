/**
 * Validation utilities for lottery creation and interaction
 */

// Maximum safe ETH amount (1 billion ETH in wei)
const MAX_SAFE_ETH = BigInt('1000000000000000000000000000');

/**
 * Validate that the sum of prizes is greater than zero
 * @param prizes - Array of prize amounts in wei
 * @returns true if sum > 0, false otherwise
 */
export function validatePrizeSum(prizes: bigint[]): boolean {
  if (prizes.length === 0) return false;
  
  const sum = prizes.reduce((acc, prize) => acc + prize, BigInt(0));
  return sum > BigInt(0);
}

/**
 * Validate that deadlines are in correct order
 * @param commit - Commit deadline timestamp (seconds)
 * @param reveal - Reveal time timestamp (seconds)
 * @returns true if commit < reveal, false otherwise
 */
export function validateDeadlines(commit: number, reveal: number): boolean {
  return commit < reveal;
}

/**
 * Validate that there are enough tickets for the prizes
 * @param tickets - Number of tickets
 * @param prizes - Number of prizes
 * @returns true if tickets >= prizes, false otherwise
 */
export function validateTicketCount(tickets: number, prizes: number): boolean {
  return tickets >= prizes && tickets > 0 && prizes > 0;
}

/**
 * Validate that an ETH amount is within safe bounds
 * @param amount - Amount in wei
 * @returns true if 0 < amount < MAX_SAFE_ETH, false otherwise
 */
export function validateEthAmount(amount: bigint): boolean {
  return amount > BigInt(0) && amount < MAX_SAFE_ETH;
}

/**
 * Validate all lottery creation parameters
 * @param params - Lottery creation parameters
 * @returns Object with isValid flag and error message if invalid
 */
export function validateLotteryCreation(params: {
  prizes: bigint[];
  ticketCount: number;
  commitDeadline: number;
  revealTime: number;
  totalAmount: bigint;
}): { isValid: boolean; error?: string } {
  if (!validatePrizeSum(params.prizes)) {
    return { isValid: false, error: 'Prize sum must be greater than zero' };
  }

  if (!validateTicketCount(params.ticketCount, params.prizes.length)) {
    return { isValid: false, error: 'Number of tickets must be greater than or equal to number of prizes' };
  }

  if (!validateDeadlines(params.commitDeadline, params.revealTime)) {
    return { isValid: false, error: 'Commit deadline must be before reveal time' };
  }

  if (!validateEthAmount(params.totalAmount)) {
    return { isValid: false, error: 'Total amount must be greater than zero and within safe bounds' };
  }

  // Verify that prize sum equals total amount
  const prizeSum = params.prizes.reduce((acc, prize) => acc + prize, BigInt(0));
  if (prizeSum !== params.totalAmount) {
    return { isValid: false, error: 'Sum of prizes must equal total amount' };
  }

  return { isValid: true };
}
