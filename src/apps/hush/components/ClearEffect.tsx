import React, { useEffect } from 'react';
import { useClearAnimation } from '../../../core/animations/ClearAnimationContext';

interface ClearEffectProps {
  onComplete: () => void;
}

export const ClearEffect = ({ onComplete }: ClearEffectProps) => {
  const { startAnimation } = useClearAnimation();

  useEffect(() => {
    // Trigger surgical precision animation via context
    // Stage 1 (0-400ms): Text disappears from all messages
    // Stage 2 (400-800ms): Empty bubbles fade away
    startAnimation(onComplete);
  }, []);

  // No overlay needed - animation happens in individual message components
  return null;
};
