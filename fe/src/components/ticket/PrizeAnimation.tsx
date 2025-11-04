import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { formatEther } from 'viem';

interface PrizeAnimationProps {
  prizeAmount: bigint;
  onAnimationComplete?: () => void;
}

export function PrizeAnimation({ prizeAmount, onAnimationComplete }: PrizeAnimationProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Only start animation if prizeAmount is defined
    if (prizeAmount === undefined) {
      return;
    }

    // Show "Checking..." animation for 3 seconds
    const checkingTimer = setTimeout(() => {
      setIsChecking(false);
      setShowResult(true);

      // If winner, trigger confetti
      if (prizeAmount > 0n) {
        triggerConfetti();
      }

      // Call completion callback after animation
      if (onAnimationComplete) {
        setTimeout(onAnimationComplete, 500);
      }
    }, 3000);

    return () => clearTimeout(checkingTimer);
  }, [prizeAmount, onAnimationComplete]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Fire confetti from two sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  if (isChecking) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-2xl animate-pulse">🎲</div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold animate-pulse">Checking your prize...</h3>
          <p className="text-muted-foreground">Hold tight, revealing your result!</p>
        </div>
      </div>
    );
  }

  if (showResult && prizeAmount > 0n) {
    return (
      <div className="text-center space-y-6 py-8 animate-in fade-in zoom-in duration-500">
        <div className="text-6xl animate-bounce">🎉</div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-green-600 animate-in slide-in-from-bottom duration-700">
            You Won!
          </h3>
          <div className="text-4xl font-bold animate-in slide-in-from-bottom duration-700 delay-150">
            {formatEther(prizeAmount)} USDC
          </div>
          <p className="text-lg text-muted-foreground animate-in fade-in duration-700 delay-300">
            Congratulations! 🎊 Click below to claim your prize.
          </p>
        </div>
      </div>
    );
  }

  if (showResult && prizeAmount === 0n) {
    return (
      <div className="text-center space-y-6 py-8 animate-in fade-in duration-500">
        <div className="text-5xl">😊</div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-muted-foreground">
            Better luck next time!
          </h3>
          <p className="text-muted-foreground">
            Your ticket didn't win a prize this time, but thanks for participating!
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Keep an eye out for the next lottery! 🎰
          </p>
        </div>
      </div>
    );
  }

  return null;
}
