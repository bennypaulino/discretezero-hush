import React from 'react';
import { ClearEffect } from '../../apps/hush/components/ClearEffect';
import { TextDust } from '../../apps/hush/components/TextDust';
import { DissolveEffect } from '../../apps/hush/components/DissolveEffect';
import { RippleEffect } from '../../apps/hush/components/RippleEffect';
import { RainEffect } from '../../apps/hush/components/RainEffect';
import { CLSEffect } from '../../apps/classified/components/CLSEffect';
import { MatrixRainEffect } from '../../apps/classified/components/MatrixRainEffect';
import { TerminalPurge } from '../../apps/classified/components/TerminalPurge';
import { RedactionEffect } from '../../apps/classified/components/RedactedEffect';
import { CorruptionEffect } from '../../apps/classified/components/CorruptionEffect';
import type { HushBurnType, ClassifiedBurnType } from '../state/rootStore';

interface AnimationProps {
  onComplete: () => void;
}

// Centralized registry of all clear animations
// Add new animations here and they'll automatically work in HushScreen, Unburdening, etc.
export const HushAnimations: Record<HushBurnType, React.ComponentType<AnimationProps>> = {
  clear: ClearEffect,
  disintegrate: TextDust,
  dissolve: DissolveEffect,
  ripple: RippleEffect,
  rain: RainEffect,
};

// Classified animations
export const ClassifiedAnimations: Record<ClassifiedBurnType, React.ComponentType<AnimationProps>> = {
  cls: CLSEffect,
  purge: TerminalPurge,
  redaction: RedactionEffect,
  corruption: CorruptionEffect,
  matrix: MatrixRainEffect,
};

// Helper function to render the appropriate animation
export const renderClearAnimation = (
  burnStyle: HushBurnType | ClassifiedBurnType,
  isClassified: boolean,
  onComplete: () => void
): React.ReactElement => {
  if (isClassified) {
    const AnimationComponent = ClassifiedAnimations[burnStyle as ClassifiedBurnType];
    return <AnimationComponent onComplete={onComplete} />;
  } else {
    const AnimationComponent = HushAnimations[burnStyle as HushBurnType];
    return <AnimationComponent onComplete={onComplete} />;
  }
};
