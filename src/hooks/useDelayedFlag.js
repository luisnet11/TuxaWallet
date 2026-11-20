import { useState, useEffect } from 'react';

export function useDelayedFlag(value, delayMs = 200) {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    let timer;
    if (value) {
      timer = setTimeout(() => setFlag(true), delayMs);
    } else {
      setFlag(false);
    }
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return flag;
}
