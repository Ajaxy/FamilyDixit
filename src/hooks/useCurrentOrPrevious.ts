import usePrevious from './usePrevious';

export default <T extends any>(current: T, updateOnlyWhenTruthy?: boolean) => {
  const prev = usePrevious(current, updateOnlyWhenTruthy);

  return current || prev;
};
