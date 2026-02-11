import React, { useState, useEffect } from 'react';
import { Text, TextStyle, View } from 'react-native';

interface DisconnectedAlertProps {
  style: TextStyle | TextStyle[];
  onComplete: () => void;
}

export const DisconnectedAlert: React.FC<DisconnectedAlertProps> = ({ style, onComplete }) => {
  const [checkVisible, setCheckVisible] = useState(true);
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'blink' | 'typing' | 'done'>('blink');
  const [charIndex, setCharIndex] = useState(0);

  const fullText = ' NETWORK STATUS: DISCONNECTED';

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (phase === 'blink') {
      // Blink sequence: show/hide checkmark 3 times
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
          setCheckVisible(blinkSequence[blinkIndex].visible);
          timeout = setTimeout(() => {
            blinkIndex++;
            blink();
          }, blinkSequence[blinkIndex].delay);
        } else {
          // Blinks complete, start typing
          setCheckVisible(true);
          setPhase('typing');
        }
      };

      blink();
    } else if (phase === 'typing') {
      // Type out " NETWORK STATUS: DISCONNECTED" character by character
      if (charIndex < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayText(fullText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 30); // 30ms per character
      } else {
        // Typing complete, signal done
        setPhase('done');
        onComplete();
      }
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [phase, charIndex, onComplete, fullText]);

  return (
    <Text style={style}>
      {'['}
      <Text style={{ opacity: checkVisible ? 1 : 0 }}>✓</Text>
      {']'}
      {displayText}
    </Text>
  );
};
