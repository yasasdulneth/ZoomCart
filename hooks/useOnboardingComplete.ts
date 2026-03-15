import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = '@zoomcart_onboarding_complete';

export function useOnboardingComplete(): {
  isComplete: boolean | null;
  isLoading: boolean;
  setComplete: () => Promise<void>;
  reset: () => Promise<void>;
} {
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)
      .then((value) => {
        setIsComplete(value === 'true');
      })
      .catch(() => setIsComplete(false))
      .finally(() => setIsLoading(false));
  }, []);

  const setComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsComplete(true);
  }, []);

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    setIsComplete(false);
  }, []);

  return { isComplete, isLoading, setComplete, reset };
}
