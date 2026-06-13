import { LEVELS, TOTAL_MAX_POINTS } from "./content";

export function calcOverallProgress(completedModules: number): number {
  return completedModules / 8;
}

export function calcScoreAttainment(totalEarned: number): number {
  return Math.round((totalEarned / TOTAL_MAX_POINTS) * 100);
}

export function calcLevel(completedModules: number): number {
  let level = 1;
  for (const l of [...LEVELS].sort((a, b) => b.minModulesCompleted - a.minModulesCompleted)) {
    if (completedModules >= l.minModulesCompleted) {
      level = l.level;
      break;
    }
  }
  return level;
}

export function getLevelTitle(level: number): string {
  return LEVELS.find((l) => l.level === level)?.title ?? "Security Rookie";
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
