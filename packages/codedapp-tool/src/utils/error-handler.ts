/**
 * Wraps a Commander action handler so thrown errors are always printed to
 * stderr before they propagate.
 *
 * uipcli's run() catch block assumes every action has already formatted its
 * own error output via OutputFormatter.error(). Because codedapp-tool actions
 * throw plain Error objects, the message is silently swallowed. This wrapper
 * ensures the message reaches the user regardless of the host CLI's behaviour.
 */
export function withErrorHandling<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await fn(...args);
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\x1b[31mError: ${message}\x1b[0m`);
      if (process.env.DEBUG && error instanceof Error) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  };
}
