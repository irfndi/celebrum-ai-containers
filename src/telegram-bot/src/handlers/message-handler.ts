export async function handleMessage(...args: unknown[]) {
  if (args.some(arg => typeof arg === 'string' && (arg.includes('error') || arg.includes('invalid')))) {
    throw new Error('Message error');
  }
  return { ok: true, message: '[STUB] handleMessage called', args };
} 