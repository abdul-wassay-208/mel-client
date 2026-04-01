import { useCallback, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

type RunOptions = {
  success?: { title: string; description?: string };
  error?: { title?: string; description?: string };
};

/**
 * Consistent pattern for API actions:
 * - prevents duplicate submissions
 * - exposes `loading`
 * - shows toast on error by default
 */
export function useAsyncAction() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts?: RunOptions): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setLoading(true);
      try {
        const res = await fn();
        if (opts?.success) {
          toast({ title: opts.success.title, description: opts.success.description });
        }
        return res;
      } catch (err) {
        toast({
          title: opts?.error?.title ?? 'Something went wrong',
          description: opts?.error?.description ?? getErrorMessage(err),
          variant: 'destructive',
        });
        return null;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [toast]
  );

  return { loading, run } as const;
}

