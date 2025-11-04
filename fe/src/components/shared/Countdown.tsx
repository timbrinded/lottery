import { useState, useCallback } from 'react';
import { useInterval, useIsomorphicLayoutEffect } from 'usehooks-ts';

interface CountdownProps {
  deadline: number; // Unix timestamp in seconds
  className?: string;
  mode?: 'precise' | 'friendly'; // New prop for display mode
  prefix?: string; // Optional prefix text (e.g., "Finishes in")
  suffix?: string; // Optional suffix text (e.g., "!")
}

export function Countdown({ 
  deadline, 
  className = '', 
  mode = 'precise',
  prefix = '',
  suffix = ''
}: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [urgency, setUrgency] = useState<'green' | 'yellow' | 'red'>('green');

  const updateCountdown = useCallback(() => {
      // Ensure deadline is a valid number
      const deadlineNum = typeof deadline === 'number' ? deadline : Number(deadline);
      if (!isFinite(deadlineNum) || isNaN(deadlineNum)) {
        setTimeRemaining('Invalid deadline');
        setUrgency('red');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const remaining = deadlineNum - now;

      if (remaining <= 0) {
        setTimeRemaining(mode === 'friendly' ? 'Ended' : 'Deadline passed');
        setUrgency('red');
        return;
      }

      // Calculate time components
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      // Format display based on mode
      let display = '';
      if (mode === 'friendly') {
        // Human-readable format
        if (days > 7) {
          // Show absolute date for > 7 days
          const date = new Date(deadlineNum * 1000);
          display = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
        } else if (days > 0) {
          display = days === 1 ? '1 day' : `${days} days`;
        } else if (hours > 0) {
          display = hours === 1 ? '1 hour' : `${hours} hours`;
        } else if (minutes > 0) {
          display = minutes === 1 ? '1 minute' : `${minutes} minutes`;
        } else {
          display = seconds === 1 ? '1 second' : `${seconds} seconds`;
        }
      } else {
        // Precise format (original behavior)
        if (days > 0) {
          display = `${days}d ${hours}h`;
        } else if (hours > 0) {
          display = `${hours}h ${minutes}m`;
        } else {
          display = `${minutes}m ${seconds}s`;
        }
      }

      setTimeRemaining(display);

      // Set urgency color
      const hoursRemaining = remaining / 3600;
      if (hoursRemaining > 24) {
        setUrgency('green');
      } else if (hoursRemaining > 6) {
        setUrgency('yellow');
      } else {
        setUrgency('red');
      }
  }, [deadline, mode]);

  // Update countdown immediately on mount/deadline change
  useIsomorphicLayoutEffect(() => {
    updateCountdown();
  }, [updateCountdown]);

  // Update countdown every second using useInterval from usehooks-ts
  useInterval(updateCountdown, 1000);

  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  const fontClass = mode === 'friendly' ? 'font-medium' : 'font-mono font-semibold';

  return (
    <span className={`${fontClass} ${colorClasses[urgency]} ${className}`}>
      {prefix && `${prefix} `}
      {timeRemaining}
      {suffix}
    </span>
  );
}
