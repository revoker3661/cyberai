import rawContent from "./content.json";
import rawQuestionBank from "./question-bank.json";
import rawLearnContent from "./learning-content.json";

export interface LessonBullet {
  title: string;
  text: string;
}

export interface LessonSection {
  heading: string;
  body?: string;
  bullets?: LessonBullet[];
}

export interface QuizQuestion {
  id: string;
  points: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Module {
  id: string;
  order: number;
  title: string;
  icon: string;
  color: string;
  hexAccent: string;
  maxPoints: number;
  lesson: { sections: LessonSection[] };
  quiz: QuizQuestion[];
  cheatSheet: string[];
}

export interface Level {
  level: number;
  title: string;
  minModulesCompleted: number;
}

// Learning content types
export interface LearnBodyBlock {
  type: "heading" | "paragraph" | "bullets" | "callout";
  text?: string;
  style?: "info" | "warning";
  items?: Array<{ title: string; text: string }>;
}

export interface LearnItem {
  id: string;
  type: "reading" | "video";
  title: string;
  estMinutes: number;
  body?: LearnBodyBlock[];
  videoId?: string;
  description?: string;
}

export interface LearnModule {
  moduleId: string;
  sectionTitle: string;
  sectionSubtitle: string;
  items: LearnItem[];
}

const content = rawContent as {
  app: {
    name: string;
    tagline: string;
    totalMaxPoints: number;
    moduleCount: number;
    certificateTitle: string;
    certificatePresenter: string;
    certificateIdFormat: string;
  };
  levels: Level[];
  formulas: Record<string, string>;
  modules: Module[];
};

// Bank questions don't have points — allocated dynamically at serve time
interface BankQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const questionBank = rawQuestionBank as unknown as {
  modules: Record<string, BankQuestion[]>;
};

const learnContent = rawLearnContent as unknown as {
  modules: Record<string, LearnModule>;
};

export const APP = content.app;
export const LEVELS = content.levels;
export const TOTAL_MAX_POINTS = content.app.totalMaxPoints;

// Merge question bank into modules (quiz pool = original + bank questions)
// Bank questions get points: 0 as placeholder — points allocated dynamically at serve time
export const MODULES: Module[] = content.modules.map((mod) => ({
  ...mod,
  quiz: [
    ...mod.quiz,
    ...(questionBank.modules[mod.id] ?? []).map((q) => ({ ...q, points: 0 })),
  ],
}));

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

// Learning content
export const LEARN_MODULES: Record<string, LearnModule> = learnContent.modules ?? {};

export function getLearnModule(moduleId: string): LearnModule | undefined {
  return LEARN_MODULES[moduleId];
}

export function getAllLearnModules(): LearnModule[] {
  return Object.values(LEARN_MODULES);
}
