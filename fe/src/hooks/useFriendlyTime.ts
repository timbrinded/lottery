import { useState } from 'react';
import { useInterval } from 'usehooks-ts';

interface FriendlyTimeOptions {
  prefix?: string;
  suffix?: string;
  showSeconds?: boolean;
}

interface FriendlyTimeResult {
  friendlyText: string;
  isPast: boolean;
  timeRemaining: number; // in seconds
}

/**
 * Hook to convert timestamps to human-readable format
 * Updates in real-time with countdown
 * 
 * @param timestamp - Unix timestamp in seconds
 * @param options - Formatting options
 * @returns Friendly time display text and metadata
 */
export function useFriendlyTime(
  timestamp: number | bigint,
  options: FriendlyTimeOptions = {}
): FriendlyTimeResult {
  const { prefix = '', suffix = '', showSeconds = true } = options;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Update current time every second using useInterval from usehooks-ts
  useInterval(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, 1000);

  const targetTime = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const timeRemaining = targetTime - now;
  const isPast = timeRemaining <= 0;

  const formatTime = (): string => {
    if (isPast) {
      return 'Ended';
    }

    const seconds = Math.abs(timeRemaining);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Less than 1 minute
    if (minutes < 1) {
      return showSeconds ? `${seconds} second${seconds !== 1 ? 's' : ''}` : 'Less than a minute';
    }

    // Less than 1 hour
    if (hours < 1) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    // Less than 24 hours
    if (days < 1) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    // Less than 7 days
    if (days < 7) {
      const remainingHours = hours % 24;
      if (remainingHours > 0) {
        return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
      }
      return `${days} day${days !== 1 ? 's' : ''}`;
    }

    // More than 7 days - show absolute date
    const date = new Date(targetTime * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timeText = formatTime();
  const friendlyText = isPast
    ? timeText
    : `${prefix}${prefix ? ' ' : ''}${timeText}${suffix ? ' ' : ''}${suffix}`;

  return {
    friendlyText,
    isPast,
    timeRemaining,
  };
}

/**
 * Format a timestamp to absolute date/time string
 */
export function formatAbsoluteTime(timestamp: number | bigint): string {
  const targetTime = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const date = new Date(targetTime * 1000);
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get relative time description (e.g., "in 2 hours", "5 minutes ago")
 */
export function getRelativeTime(timestamp: number | bigint): string {
  const targetTime = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = targetTime - now;
  const isPast = diff < 0;
  const seconds = Math.abs(diff);

  if (seconds < 60) {
    return isPast ? 'just now' : 'in a few seconds';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return isPast
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      : `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isPast
      ? `${hours} hour${hours !== 1 ? 's' : ''} ago`
      : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return isPast
      ? `${days} day${days !== 1 ? 's' : ''} ago`
      : `in ${days} day${days !== 1 ? 's' : ''}`;
  }

  return formatAbsoluteTime(timestamp);
}
