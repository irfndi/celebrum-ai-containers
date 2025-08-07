export async function handleHelp(...args: unknown[]) {
  if (args.some(arg => typeof arg === 'string' && (arg.includes('error') || arg.includes('invalid')))) {
    throw new Error('Rate limit exceeded');
  }
  return { ok: true, message: '[STUB] handleHelp called', args };
} 