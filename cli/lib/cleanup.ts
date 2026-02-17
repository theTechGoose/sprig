/**
 * Cleanup utilities for graceful shutdown
 */

type CleanupFn = () => Promise<void> | void;

const cleanupHandlers: CleanupFn[] = [];
let signalsRegistered = false;

/**
 * Register a cleanup function to run on exit.
 */
export function onCleanup(fn: CleanupFn): void {
  cleanupHandlers.push(fn);
  ensureSignalHandlers();
}

/**
 * Run all cleanup handlers.
 */
export async function runCleanup(): Promise<void> {
  for (const handler of cleanupHandlers) {
    try {
      await handler();
    } catch {
      // Ignore cleanup errors
    }
  }
  cleanupHandlers.length = 0;
}

/**
 * Ensure signal handlers are registered.
 */
function ensureSignalHandlers(): void {
  if (signalsRegistered) return;
  signalsRegistered = true;

  const handleSignal = async () => {
    console.log("\nShutting down...");
    await runCleanup();
    Deno.exit(0);
  };

  Deno.addSignalListener("SIGINT", handleSignal);
  Deno.addSignalListener("SIGTERM", handleSignal);
}

/**
 * Run a function with cleanup on exit/signal.
 */
export async function withCleanup<T>(
  cleanup: CleanupFn,
  fn: () => Promise<T>
): Promise<T> {
  onCleanup(cleanup);
  try {
    return await fn();
  } finally {
    await runCleanup();
  }
}
