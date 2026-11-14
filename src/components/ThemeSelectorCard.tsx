import React from 'react';
import { ThemeStudio, type ThemeStudioProps } from './ThemeStudio';

export type ThemeSelectorCardProps = ThemeStudioProps;

export const ThemeSelectorCard: React.FC<ThemeSelectorCardProps> = (props) => {
  return <ThemeStudio {...props} />;
};

export default ThemeSelectorCard;
