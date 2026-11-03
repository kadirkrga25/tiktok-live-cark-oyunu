import React from 'react';
import { BigGiftAlert } from './BigGiftAlert';
import { BigGiftCelebration } from '../types';

export interface BigGiftCelebrationOverlayProps {
  alert: BigGiftCelebration | null;
  onClose?: () => void;
  onDismiss?: () => void;
}

export const BigGiftCelebrationOverlay: React.FC<BigGiftCelebrationOverlayProps> = (props) => {
  return <BigGiftAlert {...props} />;
};

export default BigGiftCelebrationOverlay;
