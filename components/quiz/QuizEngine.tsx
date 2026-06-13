"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, Lightbulb, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import type { Module, QuizQuestion } from "@/lib/content";

type Confidence = "confident" | "guessing";

interface Answer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  confidence: Confidence;
}

interface QuizEngineProps {
  mod: Module;
  userId: string;
  readOnly?: boolean;
  existingAnswers?: Answer[];
}

export function QuizEngine({ mod, userId, readOnly = false, existingAnswers }: QuizEngineProps) {
  const router = useRouter();
  const questions = mod.quiz;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(existingAnswers ?? []);
  const [selectedOption, setSelectedOption] = useState<number | null>(
    existingAnswers ? existingAnswers[0]?.selectedIndex ?? null : null
  );
  const [confidence, setConfidence] = useState<Confidence>(
    existingAnswers ? existingAnswers[0]?.confidence ?? "confident" : "confident"
  );
  const [locked, setLocked] = useState(readOnly || !!existingAnswers);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [coachData, setCoachData] = useState<Record<string, unknown> | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const question: QuizQuestion = readOnly && existingAnswers
    ? questions[currentIdx]
    : questions[currentIdx];

  const currentAnswer = readOnly ? existingAnswers?.[currentIdx] : answers[currentIdx];

  function handleSelect(idx: number) {
    if (locked || readOnly) return;
    setSelectedOption(idx);
    const correct = idx === question.correctIndex;
    const answer: Answer = {
      questionId: question.id,
      selectedIndex: idx,
      correct,
      confidence,
    };
    const newAnswers = [...answers];
    newAnswers[currentIdx] = answer;
    setAnswers(newAnswers);
    setLocked(true);
  }

  async function handleNext() {
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (readOnly && existingAnswers) {
        setSelectedOption(existingAnswers[nextIdx]?.selectedIndex ?? null);
        setConfidence(existingAnswers[nextIdx]?.confidence ?? "confident");
        setLocked(true);
      } else {
        setSelectedOption(null);
        setConfidence("confident");
        setLocked(false);
      }
    } else {
      await handleFinish();
    }
  }

  const handleFinish = useCallback(async () => {
    if (readOnly) { setDone(true); return; }
    setSaving(true);
    const totalScore = answers.reduce((sum, a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return sum + (a.correct && q ? q.points : 0);
    }, 0);

    try {
      await fetch("/api/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: mod.id,
          score: totalScore,
          maxScore: mod.maxPoints,
          answers,
        }),
      });
    } catch {}

    // Get coach analysis
    setCoachLoading(true);
    try {
      const coachRes = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleTitle: mod.title,
          questions: answers.map((a) => {
            const q = questions.find((q) => q.id === a.questionId);
            return {
              question: q?.question,
              chosen: q?.options[a.selectedIndex],
              correct: q?.options[q.correctIndex],
              wasCorrect: a.correct,
              confidence: a.confidence,
            };
          }),
        }),
      });
      if (coachRes.ok) setCoachData(await coachRes.json());
    } catch {}
    setCoachLoading(false);
    setSaving(false);
    setDone(true);
  }, [answers, mod, questions, readOnly]);

  if (done && !readOnly) {
    const totalScore = answers.reduce((sum, a) => {
      const q = questions.find((q) => q.id === a.questionId);
      return sum + (a.correct && q ? q.points : 0);
    }, 0);
    const pct = Math.round((totalScore / mod.maxPoints) * 100);

    return (
      <ResultsScreen
        mod={mod}
        answers={answers}
        questions={questions}
        totalScore={totalScore}
        pct={pct}
        coachData={coachData}
        coachLoading={coachLoading}
      />
    );
  }

  const effectiveLocked = readOnly ? true : locked;
  const effectiveSelected = readOnly ? currentAnswer?.selectedIndex ?? null : selectedOption;
  const effectiveCorrect = readOnly ? currentAnswer?.correct ?? false : selectedOption !== null && selectedOption === question.correctIndex;
  const isCorrect = effectiveLocked && effectiveSelected === question.correctIndex;
  const isWrong = effectiveLocked && effectiveSelected !== null && effectiveSelected !== question.correctIndex;

  const progressPct = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{mod.title} Quiz</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Question {currentIdx + 1} of {questions.length} | +{question.points} points
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: mod.hexAccent }}
        />
      </div>

      {/* Question */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
        <p className="font-semibold text-gray-900 dark:text-white text-sm leading-relaxed">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2" role="radiogroup" aria-label="Answer options">
        {question.options.map((option, idx) => {
          const isSelected = effectiveSelected === idx;
          const isCorrectOption = idx === question.correctIndex;
          let optionClass = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400";

          if (effectiveLocked) {
            if (isCorrectOption) {
              optionClass = "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200";
            } else if (isSelected && !isCorrectOption) {
              optionClass = "border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200";
            } else {
              optionClass = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500";
            }
          } else if (isSelected) {
            optionClass = "border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200";
          }

          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(idx)}
              disabled={effectiveLocked}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${optionClass} focus:outline-none focus:ring-2 focus:ring-indigo-400`}
            >
              <span>{option}</span>
              {effectiveLocked && isCorrectOption && <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />}
              {effectiveLocked && isSelected && !isCorrectOption && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Confidence selector */}
      {!readOnly && (
        <div className="grid grid-cols-2 gap-3" aria-label="Confidence level">
          <button
            onClick={() => !locked && setConfidence("confident")}
            disabled={locked}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              confidence === "confident"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${confidence === "confident" ? "border-indigo-500" : "border-gray-400"}`}>
              {confidence === "confident" && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </div>
            <Brain size={16} />
            Confident
          </button>
          <button
            onClick={() => !locked && setConfidence("guessing")}
            disabled={locked}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              confidence === "guessing"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${confidence === "guessing" ? "border-indigo-500" : "border-gray-400"}`}>
              {confidence === "guessing" && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </div>
            <Lightbulb size={16} />
            Just Guessing
          </button>
        </div>
      )}

      {/* Explanation */}
      {effectiveLocked && (
        <div
          aria-live="polite"
          className={`rounded-xl p-4 ${
            (isCorrect || (readOnly && currentAnswer?.correct))
              ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb
              size={16}
              className={(isCorrect || (readOnly && currentAnswer?.correct)) ? "text-emerald-600" : "text-red-600"}
            />
            <span
              className={`text-sm font-semibold ${(isCorrect || (readOnly && currentAnswer?.correct)) ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
            >
              Explanation:
            </span>
          </div>
          <p className={`text-sm ${(isCorrect || (readOnly && currentAnswer?.correct)) ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}`}>
            {question.explanation}
          </p>
        </div>
      )}

      {/* Next / Finish */}
      {effectiveLocked && (
        <button
          onClick={readOnly ? handleNext : handleNext}
          disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: mod.hexAccent }}
        >
          {saving ? "Saving…" : currentIdx < questions.length - 1 ? "Next Question" : readOnly ? "Done" : "Finish Quiz"}
          {!saving && <ArrowRight size={16} className="inline ml-2" />}
        </button>
      )}
    </div>
  );
}

function ResultsScreen({
  mod, answers, questions, totalScore, pct, coachData, coachLoading,
}: {
  mod: Module;
  answers: Answer[];
  questions: QuizQuestion[];
  totalScore: number;
  pct: number;
  coachData: Record<string, unknown> | null;
  coachLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg width="128" height="128" className="-rotate-90">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke={mod.hexAccent}
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - pct / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Quiz Complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          You scored <strong className="text-gray-900 dark:text-white">{totalScore} / {mod.maxPoints} points</strong>
        </p>
      </div>

      {/* Per-question recap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Question Review</h3>
        {answers.map((ans, i) => {
          const q = questions.find((q) => q.id === ans.questionId);
          if (!q) return null;
          return (
            <div
              key={ans.questionId}
              className={`flex items-start gap-3 p-3 rounded-lg ${ans.correct ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10"}`}
            >
              {ans.correct
                ? <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                : <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              }
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Q{i + 1}: {q.question}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Your answer: {q.options[ans.selectedIndex]} •{" "}
                  <span className={ans.correct ? "text-emerald-600" : "text-red-600"}>
                    {ans.correct ? `+${q.points} pts` : "0 pts"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Coach */}
      {(coachLoading || coachData) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Brain size={18} className="text-indigo-500" /> Cognitive Security Report
          </h3>
          {coachLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Analyzing your performance…</div>
          ) : coachData && (
            <div className="space-y-3 text-sm">
              <p className="text-gray-700 dark:text-gray-300">{String(coachData.summary ?? "")}</p>
              {Array.isArray(coachData.blindSpots) && coachData.blindSpots.length > 0 && (
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400 mb-1">🎯 Blind Spots (confident but wrong):</p>
                  <ul className="space-y-1">
                    {(coachData.blindSpots as string[]).map((s: string, i: number) => (
                      <li key={i} className="text-gray-600 dark:text-gray-400 flex gap-2">
                        <span>•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(coachData.luckyGuesses) && coachData.luckyGuesses.length > 0 && (
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">🍀 Lucky Guesses (guessing but correct):</p>
                  <ul className="space-y-1">
                    {(coachData.luckyGuesses as string[]).map((s: string, i: number) => (
                      <li key={i} className="text-gray-600 dark:text-gray-400 flex gap-2">
                        <span>•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {typeof coachData.recommendation === "string" && coachData.recommendation && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">💡 Recommendation:</p>
                  <p className="text-indigo-800 dark:text-indigo-200">{coachData.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => router.push(`/modules/${mod.id}/lesson`)}
          className="py-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: mod.hexAccent }}
        >
          Review Lesson
        </button>
      </div>
    </div>
  );
}
