import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDate }: { targetDate?: string }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    // Basic countdown to a sample date, you might want to customize this
    const parsedTargetDate = targetDate ? new Date(targetDate).getTime() : new Date('2025-01-01T00:00:00').getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = parsedTargetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <div 
          className="text-white font-black font-mono text-5xl md:text-7xl tracking-[0.3em] uppercase animate-pulse" 
          style={{ textShadow: '4px 4px 0px #000' }}
        >
          EXAM STARTED
        </div>
        <div className="text-white/70 text-sm font-bold tracking-widest font-mono uppercase">
          T-MINUS ZERO REACHED
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 text-center font-sans text-white">
      <div className="flex flex-col items-center">
        <div className="text-5xl font-bold tracking-widest tabular-nums">{timeLeft.days.toString().padStart(2, '0')}</div>
        <div className="text-xs font-bold opacity-80 tracking-[0.2em] uppercase">Days</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-5xl font-bold tracking-widest tabular-nums">{timeLeft.hours.toString().padStart(2, '0')}</div>
        <div className="text-xs font-bold opacity-80 tracking-[0.2em] uppercase">Hrs</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-5xl font-bold tracking-widest tabular-nums">{timeLeft.minutes.toString().padStart(2, '0')}</div>
        <div className="text-xs font-bold opacity-80 tracking-[0.2em] uppercase">Min</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-5xl font-bold tracking-widest tabular-nums">{timeLeft.seconds.toString().padStart(2, '0')}</div>
        <div className="text-xs font-bold opacity-80 tracking-[0.2em] uppercase">Sec</div>
      </div>
    </div>
  );
};

export default CountdownTimer;
