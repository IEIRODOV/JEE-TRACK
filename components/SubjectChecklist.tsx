import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Calculator, Atom, Beaker } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Chapter {
  id: string;
  name: string;
  completed: boolean;
}

interface Subject {
  name: string;
  color: string;
  font: string;
  chapters: Chapter[];
}

const SubjectIcon = ({ name }: { name: string }) => {
  switch (name.toLowerCase()) {
    case 'maths': return <Calculator className="w-6 h-6" />;
    case 'physics': return <Atom className="w-6 h-6" />;
    case 'chemistry': return <Beaker className="w-6 h-6" />;
    default: return null;
  }
};

const INITIAL_DATA: Record<string, string[]> = {
  Maths: [
    "Sets, Relations & Functions", "Complex Numbers", "Matrices & Determinants",
    "Quadratic Equations", "Permutations & Combinations", "Binomial Theorem",
    "Sequences & Series", "Limit, Continuity & Differentiability", "Integral Calculus",
    "Differential Equations", "Coordinate Geometry", "Vector Algebra & 3D",
    "Probability", "Trigonometry", "Mathematical Reasoning"
  ],
  Physics: [
    "Kinematics", "Laws of Motion", "Work, Energy & Power", "Rotational Motion",
    "Gravitation", "Thermodynamics", "Oscillations & Waves", "Electrostatics",
    "Current Electricity", "Magnetism", "Electromagnetic Induction", "Optics",
    "Modern Physics", "Electronic Devices"
  ],
  Chemistry: [
    "Atomic Structure", "Chemical Bonding", "Thermodynamics", "Equilibrium",
    "Chemical Kinetics", "Electrochemistry", "Periodic Table", "Coordination Compounds",
    "General Organic Chemistry", "Hydrocarbons", "Biomolecules", "Polymers"
  ]
};

const SubjectChecklist = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('jee-track-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up any old data that might have React elements (icons) stored as objects
        const cleaned = parsed.map((s: any) => {
          const { icon, iconId, ...rest } = s;
          return rest;
        });
        setSubjects(cleaned);
      } catch (e) {
        console.error("Failed to parse saved data", e);
        // Fallback to initial if parsing fails
        setInitialData();
      }
    } else {
      setInitialData();
    }
  }, []);

  const setInitialData = () => {
    const initial: Subject[] = [
      {
        name: "Maths",
        color: "text-blue-400 border-blue-400/30 bg-blue-400/10",
        font: "font-mono",
        chapters: INITIAL_DATA.Maths.map(name => ({ id: `math-${name}`, name, completed: false }))
      },
      {
        name: "Physics",
        color: "text-rose-400 border-rose-400/30 bg-rose-400/10",
        font: "font-sans",
        chapters: INITIAL_DATA.Physics.map(name => ({ id: `phys-${name}`, name, completed: false }))
      },
      {
        name: "Chemistry",
        color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
        font: "font-serif",
        chapters: INITIAL_DATA.Chemistry.map(name => ({ id: `chem-${name}`, name, completed: false }))
      }
    ];
    setSubjects(initial);
  };

  const toggleChapter = (subjectIndex: number, chapterIndex: number) => {
    const newSubjects = [...subjects];
    newSubjects[subjectIndex].chapters[chapterIndex].completed = !newSubjects[subjectIndex].chapters[chapterIndex].completed;
    setSubjects(newSubjects);
    localStorage.setItem('jee-track-data', JSON.stringify(newSubjects));
  };

  const totalChapters = subjects.reduce((acc, s) => acc + s.chapters.length, 0);
  const completedChapters = subjects.reduce((acc, s) => acc + s.chapters.filter(c => c.completed).length, 0);
  const totalProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      {/* Total Progress Bar */}
      <div className="mb-12 p-8 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold font-heading">Overall Completion</h3>
            <div className="text-3xl font-black text-white tracking-tighter mt-1 font-heading">
              {totalProgress}%
            </div>
          </div>
          <div className="text-right">
            <span className="text-white/40 text-sm font-mono">
              {completedChapters} / {totalChapters} Chapters
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="h-full bg-gradient-to-r from-blue-500 via-rose-500 to-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {subjects.map((subject, sIdx) => (
        <div key={subject.name} className={`rounded-2xl border backdrop-blur-md p-6 flex flex-col h-[500px] ${subject.color}`}>
          <div className="flex items-center gap-3 mb-6">
            <SubjectIcon name={subject.name} />
            <h2 className={`text-lg font-black uppercase tracking-[0.2em] ${subject.font}`}>
              {subject.name}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-3">
              {subject.chapters.map((chapter, cIdx) => (
                <button
                  key={chapter.id}
                  onClick={() => toggleChapter(sIdx, cIdx)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group text-left
                    ${chapter.completed ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60'}`}
                >
                  {chapter.completed ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-current" />
                  ) : (
                    <Circle className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100" />
                  )}
                  <span className={`text-sm font-medium leading-tight ${chapter.completed ? 'line-through opacity-50' : ''}`}>
                    {chapter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex justify-between items-end">
              <span className="text-xs uppercase tracking-wider opacity-60">Progress</span>
              <span className="text-lg font-bold">
                {Math.round((subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100}%` }}
                className="h-full bg-current"
              />
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default SubjectChecklist;
