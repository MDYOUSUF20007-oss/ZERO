import React, { createContext, useContext, type ReactNode } from 'react';
import type { InterfaceStyle } from '../types';

export interface InterfaceStyleContextValue {
  interfaceStyle: InterfaceStyle;
  isBespoke: boolean;
  isFluentGlass: boolean;
  isMaterialYou: boolean;
  materialYouSeed?: 'purple' | 'cyan' | 'emerald' | 'crimson';
  materialYouAmoled?: boolean;
  setMaterialYouSeed?: (seed: 'purple' | 'cyan' | 'emerald' | 'crimson') => void;
  setMaterialYouAmoled?: (amoled: boolean) => void;
  /** @deprecated use isFluentGlass */
  isLiquidGlass: boolean;
  setInterfaceStyle: (next: InterfaceStyle) => void;
}

const DEFAULT_CONTEXT: InterfaceStyleContextValue = {
  interfaceStyle: 'classic',
  isBespoke: false,
  isFluentGlass: false,
  isMaterialYou: false,
  isLiquidGlass: false,
  setInterfaceStyle: () => {},
};

const InterfaceStyleContext = createContext<InterfaceStyleContextValue>(DEFAULT_CONTEXT);

export const InterfaceStyleProvider: React.FC<{
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (next: InterfaceStyle) => void;
  materialYouSeed?: 'purple' | 'cyan' | 'emerald' | 'crimson';
  materialYouAmoled?: boolean;
  setMaterialYouSeed?: (seed: 'purple' | 'cyan' | 'emerald' | 'crimson') => void;
  setMaterialYouAmoled?: (amoled: boolean) => void;
  children: ReactNode;
}> = ({
  interfaceStyle,
  setInterfaceStyle,
  materialYouSeed,
  materialYouAmoled,
  setMaterialYouSeed,
  setMaterialYouAmoled,
  children,
}) => {
  return (
    <InterfaceStyleContext.Provider
      value={{
        interfaceStyle,
        isBespoke: interfaceStyle === 'bespoke',
        isFluentGlass: interfaceStyle === 'fluent_glass',
        isMaterialYou: interfaceStyle === 'material-you',
        isLiquidGlass: interfaceStyle === 'fluent_glass',
        materialYouSeed,
        materialYouAmoled,
        setMaterialYouSeed,
        setMaterialYouAmoled,
        setInterfaceStyle,
      }}
    >
      {children}
    </InterfaceStyleContext.Provider>
  );
};

export function useInterfaceStyle(): InterfaceStyleContextValue {
  return useContext(InterfaceStyleContext);
}

