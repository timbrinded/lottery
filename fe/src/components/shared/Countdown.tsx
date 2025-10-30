import { useEffect, useState } from 'react';

interface CountdownProps {
  deadline: number; // Unix timestamp in seconds
  className?: string;
}

export function Countdown({ deadline, className = '' }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [urgency, setUrgency] = useState<'green' | 'yellow' | 'red'>('green');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeRemaining('Deadline passed');
        setUrgency('red');
        return;
      }

      // Calculate time components
      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      // Format display based on time remaining
      let display = '';
      if (days > 0) {
        display = `${days}d ${hours}h`;
      } else if (hours > 0) {
        display = `${hours}h ${minutes}m`;
      } else {
        display = `${minutes}m ${seconds}s`;
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
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <span className={`font-mono font-semibold ${colorClasses[urgency]} ${className}`}>
      {timeRemaining}
    </span>
  );
}
