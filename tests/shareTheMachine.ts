import os from "node:os";

// On a developer machine the tests share the CPU with the editor, a dev server and often a second test run, so every
// run (npm test, npx vitest, the release script) takes half the threads and drops below normal priority; the worker
// processes inherit it. Without this Vitest takes all threads but one at normal priority. CI keeps Vitest's defaults.
export function shareTheMachine(): number | undefined {
  if (process.env.CI) return undefined;
  try {
    os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    // Not allowed here: run at the priority we were given.
  }
  return Math.max(1, Math.floor(os.availableParallelism() / 2));
}
