import type { GuideStep } from '#/components/ui/page-guide';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface GuideContextType {
  steps: GuideStep[];
  setSteps: (steps: GuideStep[]) => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<GuideStep[]>([]);

  return (
    <GuideContext.Provider value={{ setSteps, steps }}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuide() {
  const context = useContext(GuideContext);
  if (context === undefined) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
}
