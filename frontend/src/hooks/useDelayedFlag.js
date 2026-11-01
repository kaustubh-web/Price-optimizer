import { useEffect, useState } from 'react';

/** True once `active` has stayed true for `delay` ms. Used to surface slow cold starts. */
export function useDelayedFlag(active, delay) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setElapsed(true), delay);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delay]);

  return active && elapsed;
}
