import { useEffect, useRef } from 'react';

const useDeepCompareEffect = (callback: () => void, dependencies: any[]) => {
  const currentDependenciesRef = useRef(dependencies);

  if (JSON.stringify(currentDependenciesRef.current) !== JSON.stringify(dependencies)) {
    currentDependenciesRef.current = dependencies;
  }

  useEffect(callback, [currentDependenciesRef.current]);
};

export default useDeepCompareEffect;
