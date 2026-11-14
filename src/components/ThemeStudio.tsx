import React from 'react';
import type { ThemeConfig } from '../types';

export interface ThemeStudioProps {
  themeConfig?: ThemeConfig;
  onChange?: (next: ThemeConfig) => void;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = () => {
  return null;
};

export default ThemeStudio;
