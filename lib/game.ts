import { LEVELS, TOTAL_MAX_POINTS } from "./content";

export const PASS_THRESHOLD = 0.70;
export const QUIZ_SERVE_COUNT = 15;
export const CONFIDENCE_BONUS_MULTIPLIER = 1.25;

export function calcOverallProgress(passedModules: number): number {
  return passedModules / 8;
}

export function calcScoreAttainment(totalEarned: number): number {
  return Math.round((totalEarned / TOTAL_MAX_POINTS) * 100);
}

export function calcLevel(passedModules: number): number {
  let level = 1;
  for (const l of [...LEVELS].sort((a, b) => b.minModulesCompleted - a.minModulesCompleted)) {
    if (passedModules >= l.minModulesCompleted) {
      level = l.level;
      break;
    }
  }
  return level;
}

export function getLevelTitle(level: number): string {
  return LEVELS.find((l) => l.level === level)?.title ?? "Security Rookie";
}

/** Distribute modulePoints across serveCount questions as evenly as possible.
 *  Remainder goes to the last questions so the sum is always exact. */
export function allocatePoints(modulePoints: number, serveCount: number): number[] {
  const base = Math.floor(modulePoints / serveCount);
  const remainder = modulePoints - base * serveCount;
  return Array.from({ length: serveCount }, (_, i) =>
    i >= serveCount - remainder ? base + 1 : base
  );
}

/** Fisher–Yates shuffle (in-place, returns array). */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** isPassed: score >= PASS_THRESHOLD * maxServedPoints */
export function isPassed(score: number, maxServedPoints: number): boolean {
  return score >= PASS_THRESHOLD * maxServedPoints;
}

// Assertions — wireframe numbers are the test cases
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`game.ts assertion failed: ${msg}`);
}

assert(calcScoreAttainment(1950) === 38, "1950→38%");
assert(calcScoreAttainment(2850) === 56, "2850→56%");
assert(calcScoreAttainment(4350) === 85, "4350→85%");
assert(calcLevel(4) === 4, "4 modules→Lv4");
assert(calcLevel(6) === 5, "6 modules→Lv5");
assert(calcLevel(8) === 5, "8 modules→Lv5");
assert(Math.round(calcOverallProgress(4) * 100) === 50, "4/8→50%");
assert(Math.round(calcOverallProgress(6) * 100) === 75, "6/8→75%");
assert(Math.round(calcOverallProgress(8) * 100) === 100, "8/8→100%");

// Pass threshold tests
assert(!isPassed(9, 15 * Math.floor(500 / 15)), "fail at ~60%");
assert(isPassed(500, 500), "pass at 100%");
const points = allocatePoints(500, 15);
assert(points.length === 15, "allocate length");
assert(points.reduce((a, b) => a + b, 0) === 500, "allocate sum=500");
