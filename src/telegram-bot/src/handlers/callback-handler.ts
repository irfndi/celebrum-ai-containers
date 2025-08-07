export async function handleCallback(...args: unknown[]) {
  if (args.some(arg => typeof arg === 'string' && (arg.includes('error') || arg.includes('invalid')))) {
    throw new Error('Invalid callback data');
  }
  return { ok: true, message: '[STUB] handleCallback called', args };
} 