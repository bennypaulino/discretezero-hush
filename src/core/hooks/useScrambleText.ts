import { useState, useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

export const useScrambleText = (text: string, trigger: boolean) => {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (trigger) {
      let iteration = 0;

      intervalRef.current = setInterval(() => {
        setDisplay((prev) =>
          prev.split('').map((char, index) => {
            // Keep spaces to preserve word shape
            if (char === ' ') return ' ';

            // Once scrambled, keep it scrambled (or re-scramble for chaos)
            // We re-scramble for active "glitching" look
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          }).join('')
        );

        iteration += 1;
        // Optional: stop after some time, or let it run until component unmounts
      }, 50); // Speed of character updates (50ms = fast glitch)
    } else {
      setDisplay(text);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trigger, text]);

  return display;
};
