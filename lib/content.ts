import rawContent from "./content.json";

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

export const APP = content.app;
export const LEVELS = content.levels;
export const MODULES: Module[] = content.modules;
export const TOTAL_MAX_POINTS = content.app.totalMaxPoints;

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}
