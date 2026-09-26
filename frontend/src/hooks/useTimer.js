import { useState, useEffect } from 'react';

const formatDuration = (totalSecs) => {
  const h = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// serverTimeOffset corrects for clock differences between this device and the server.
export function useTimer(gameData, serverTimeOffset = 0) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  let totalSecs = gameData?.play_time || 0;
  if (gameData?.last_resume_at) {
    totalSecs += Math.max(0, Math.floor((now + serverTimeOffset - gameData.last_resume_at) / 1000));
  }
  return formatDuration(totalSecs);
}
