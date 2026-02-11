import React, { useState } from 'react';
import { UnburdeningSelector, UnburdeningMode } from './UnburdeningSelector';
import { UnburdeningFreeform } from './UnburdeningFreeform';
import { UnburdeningChat } from './UnburdeningChat';
import { UnburdeningGuided } from './UnburdeningGuided';

interface UnburdeningProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const Unburdening: React.FC<UnburdeningProps> = ({ onComplete, onCancel }) => {
  const [selectedMode, setSelectedMode] = useState<UnburdeningMode | null>(null);

  if (!selectedMode) {
    return (
      <UnburdeningSelector
        onModeSelect={setSelectedMode}
        onCancel={onCancel}
      />
    );
  }

  switch (selectedMode) {
    case 'freeform':
      return (
        <UnburdeningFreeform
          onComplete={onComplete}
          onCancel={onCancel}
        />
      );

    case 'chat':
      return (
        <UnburdeningChat
          onComplete={onComplete}
          onCancel={onCancel}
        />
      );

    case 'guided':
      return (
        <UnburdeningGuided
          onComplete={onComplete}
          onCancel={onCancel}
        />
      );

    default:
      return (
        <UnburdeningSelector
          onModeSelect={setSelectedMode}
          onCancel={onCancel}
        />
      );
  }
};
