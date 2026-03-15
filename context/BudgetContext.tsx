import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface BudgetState {
  budget: number;
  currentSpent: number;
  isActive: boolean;
}

interface BudgetContextValue extends BudgetState {
  startBudget: (budget: number) => void;
  addExpense: (amount: number) => { ok: boolean; reason?: 'limit_reached' | 'inactive' | 'invalid' };
  resetBudget: () => void;
  isLimitReached: () => boolean;
  remaining: number;
  progress: number;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BudgetState>({
    budget: 0,
    currentSpent: 0,
    isActive: false,
  });

  const startBudget = useCallback((budget: number) => {
    const safe = Number.isFinite(budget) ? budget : 0;
    setState({ budget: Math.max(0, safe), currentSpent: 0, isActive: safe > 0 });
  }, []);

  const resetBudget = useCallback(() => {
    setState({ budget: 0, currentSpent: 0, isActive: false });
  }, []);

  const isLimitReached = useCallback(() => {
    return state.isActive && state.budget > 0 && state.currentSpent >= state.budget;
  }, [state.isActive, state.budget, state.currentSpent]);

  const addExpense = useCallback(
    (amount: number) => {
      const safe = Number.isFinite(amount) ? amount : 0;
      if (!state.isActive) return { ok: true, reason: 'inactive' as const };
      if (safe <= 0) return { ok: false, reason: 'invalid' as const };
      const next = state.currentSpent + safe;
      if (next > state.budget) return { ok: false, reason: 'limit_reached' as const };
      setState((prev) => ({ ...prev, currentSpent: prev.currentSpent + safe }));
      return { ok: true as const };
    },
    [state.isActive, state.currentSpent, state.budget]
  );

  const remaining = useMemo(() => {
    if (!state.isActive) return 0;
    return Math.max(0, state.budget - state.currentSpent);
  }, [state.isActive, state.budget, state.currentSpent]);

  const progress = useMemo(() => {
    if (!state.isActive || state.budget <= 0) return 0;
    return Math.max(0, Math.min(1, state.currentSpent / state.budget));
  }, [state.isActive, state.budget, state.currentSpent]);

  const value: BudgetContextValue = useMemo(
    () => ({
      ...state,
      startBudget,
      addExpense,
      resetBudget,
      isLimitReached,
      remaining,
      progress,
    }),
    [state, startBudget, addExpense, resetBudget, isLimitReached, remaining, progress]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
}

export function useBudgetOptional() {
  return useContext(BudgetContext);
}

