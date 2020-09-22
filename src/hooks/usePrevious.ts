import { useRef } from 'react';

export default <T extends any>(next: T, updateOnlyWhenTruthy?: boolean) => {
  const ref = useRef<T>();
  const { current } = ref;
  if (!updateOnlyWhenTruthy || next !== undefined) {
    ref.current = next;
  }

  return current;
};
