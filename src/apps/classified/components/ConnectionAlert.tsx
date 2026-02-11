import React, { useState, useEffect } from 'react';
import { Text, TextStyle } from 'react-native';

interface ConnectionAlertProps {
  style: TextStyle | TextStyle[];
  onComplete: () => void;
}

export const ConnectionAlert: React.FC<ConnectionAlertProps> = ({ style, onComplete }) => {
  const [exclamationVisible, setExclamationVisible] = useState(true);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'blink' | 'typing' | 'done'>('blink');
  const [charIndex, setCharIndex] = useState(0);

  const fullText = ' CONNECTION DETECTED';

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (phase === 'blink') {
      // Blink sequence: show/hide exclamation mark 3 times
      const blinkSequence = [
        { visible: true, delay: 300 },
        { visible: false, delay: 200 },
        { visible: true, delay: 300 },
        { visible: false, delay: 200 },
        { visible: true, delay: 300 },
        { visible: false, delay: 200 },
        { visible: true, delay: 400 },
      ];

      let blinkIndex = 0;

      const blink = () => {
        if (blinkIndex < blinkSequence.length) {
          setExclamationVisible(blinkSequence[blinkIndex].visible);
          timeout = setTimeout(() => {
            blinkIndex++;
            blink();
          }, blinkSequence[blinkIndex].delay);
        } else {
          // Blinks complete, start typing
          setExclamationVisible(true);
          setPhase('typing');
        }
      };

      blink();
    } else if (phase === 'typing') {
      // Type out " CONNECTION DETECTED" character by character
      if (charIndex < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayText(fullText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 30); // 30ms per character
      } else {
        // Typing complete, pause before signaling done
        timeout = setTimeout(() => {
          setPhase('done');
          onComplete();
        }, 600); // 600ms pause before triggering next element
      }
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [phase, charIndex, onComplete, fullText]);

  return (
    <Text style={style}>
      {'['}
      <Text style={{ opacity: exclamationVisible ? 1 : 0 }}>!</Text>
      {']'}
      {displayText}
    </Text>
  );
};
