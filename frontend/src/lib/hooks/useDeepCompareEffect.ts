import { useEffect, useRef } from 'react';

/**
 * A custom hook that performs deep comparison of dependencies instead of reference equality.
 * Uses a signal counter that updates when dependencies deeply change, allowing React to properly
 * track when the effect should re-run.
 */
const useDeepCompareEffect = (callback: () => void | (() => void), dependencies: unknown[]) => {
  const currentDependenciesRef = useRef<unknown[]>(dependencies);
  const signalRef = useRef<number>(0);

  // Deep compare and update signal when dependencies change
  if (JSON.stringify(currentDependenciesRef.current) !== JSON.stringify(dependencies)) {
    currentDependenciesRef.current = dependencies;
    signalRef.current += 1;
  }

  // Use the signal as dependency so React can properly track changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, [signalRef.current]);
};

export default useDeepCompareEffect;
