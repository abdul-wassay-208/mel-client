export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, opts?: { status?: number; code?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.code = opts?.code;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || fallback;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

