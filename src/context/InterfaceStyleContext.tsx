import React, { createContext, useContext, type ReactNode } from 'react';
import type { InterfaceStyle } from '../types';

export interface InterfaceStyleContextValue {
  interfaceStyle: InterfaceStyle;
  isBespoke: boolean;
  isLiquidGlass: boolean;
  setInterfaceStyle: (next: InterfaceStyle) => void;
}

const DEFAULT_CONTEXT: InterfaceStyleContextValue = {
  interfaceStyle: 'classic',
  isBespoke: false,
  isLiquidGlass: false,
  setInterfaceStyle: () => {},
};

const InterfaceStyleContext = createContext<InterfaceStyleContextValue>(DEFAULT_CONTEXT);

export const InterfaceStyleProvider: React.FC<{
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (next: InterfaceStyle) => void;
  children: ReactNode;
}> = ({ interfaceStyle, setInterfaceStyle, children }) => {
  return (
    <InterfaceStyleContext.Provider
      value={{
        interfaceStyle,
        isBespoke: interfaceStyle === 'bespoke',
        isLiquidGlass: interfaceStyle === 'liquid_glass',
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
