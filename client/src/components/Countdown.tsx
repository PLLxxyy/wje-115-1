import { useState, useEffect } from 'react';

interface CountdownProps {
  deadline: string;
}

export default function Countdown({ deadline }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft.total <= 0) {
    return <span style={{ color: '#e63946', fontWeight: 600, fontSize: 14 }}>报名已截止</span>;
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: '#888' }}>距报名截止</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {timeLeft.days > 0 && (
          <TimeBlock value={timeLeft.days} label="天" />
        )}
        <TimeBlock value={timeLeft.hours} label="时" />
        <TimeBlock value={timeLeft.minutes} label="分" />
        <TimeBlock value={timeLeft.seconds} label="秒" />
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <span style={{
      background: '#1a1a2e',
      color: '#fff',
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 13,
      fontWeight: 600,
      minWidth: 32,
      textAlign: 'center',
    }}>
      {String(value).padStart(2, '0')}{label}
    </span>
  );
}

function getTimeLeft(deadline: string) {
  const total = new Date(deadline).getTime() - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}
