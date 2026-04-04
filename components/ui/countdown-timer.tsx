import React, { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
    <div key={interval} className="flex flex-col items-center mx-2 md:mx-4">
      <span className="text-4xl md:text-6xl font-bold text-white tracking-tighter">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-xs md:text-sm uppercase text-white/60 tracking-widest mt-1">
        {interval}
      </span>
    </div>
  ));

  return (
    <div className="flex items-center justify-center mt-8">
      {timerComponents.length ? timerComponents : <span className="text-white text-2xl">Exam Day!</span>}
    </div>
  );
};

export default CountdownTimer;
