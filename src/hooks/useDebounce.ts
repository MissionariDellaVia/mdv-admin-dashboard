import { useState, useEffect } from 'react';

/**
 * Hook per ritardare l'aggiornamento di un valore.
 * Utile per evitare troppe chiamate API durante la digitazione.
 *
 * @param value - Il valore da debounce
 * @param delay - Ritardo in millisecondi (default 300ms)
 * @returns Il valore dopo il delay
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
