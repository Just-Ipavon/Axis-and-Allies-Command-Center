import { useState, useEffect } from 'react';

export function useTimer(gameData) {
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');

  useEffect(() => {
    if (!gameData) return;
    const interval = setInterval(() => {
      let totalSecs = gameData.play_time || 0;
      if (gameData.last_resume_at) {
        totalSecs += Math.floor((Date.now() - gameData.last_resume_at) / 1000);
      }
      const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
      const s = String(totalSecs % 60).padStart(2, '0');
      setTimerDisplay(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameData]);

  return timerDisplay;
}
