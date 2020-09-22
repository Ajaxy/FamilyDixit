import { useCallback, useState } from 'react';

export default (): [boolean, () => void, () => void] => {
  const [isOpen, setIsOpen] = useState(false);

  const setTrue = useCallback(() => {
    setIsOpen(true);
  }, []);

  const setFalse = useCallback(() => {
    setIsOpen(false);
  }, []);

  return [isOpen, setTrue, setFalse];
};
