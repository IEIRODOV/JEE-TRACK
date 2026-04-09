import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Calculator, Atom, Beaker, ScrollText, Globe, Landmark, Coins, Microscope, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, onAuthStateChanged, db, doc, onSnapshot, setDoc, User, handleFirestoreError, OperationType } from '@/src/firebase';

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

import { playTickSound, playCheckSound } from '@/src/lib/sounds';
import { SYLLABUS_DATA } from '@/src/constants/syllabus';

const SubjectIcon = ({ name }: { name: string }) => {
  switch (name.toLowerCase()) {
    case 'mathematics':
    case 'maths': return <Calculator className="w-6 h-6" />;
    case 'physics': return <Atom className="w-6 h-6" />;
    case 'chemistry': return <Beaker className="w-6 h-6" />;
    case 'biology': return <Microscope className="w-6 h-6" />;
    case 'science': return <Atom className="w-6 h-6" />;
    case 'history': return <ScrollText className="w-6 h-6" />;
    case 'geography': return <Globe className="w-6 h-6" />;
    case 'civics': return <Landmark className="w-6 h-6" />;
    case 'economics': return <Coins className="w-6 h-6" />;
    case 'social science': return <Globe className="w-6 h-6" />;
    default: return <BookOpen className="w-6 h-6" />;
  }
};

interface SubjectChecklistProps {
  category: string;
  examId: string;
}

const SubjectChecklist = ({ category, examId }: SubjectChecklistProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progressData, setProgressData] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Progress Data instead of Checklist Data
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'users', user.uid, 'data', `progress-${examId}`);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setProgressData(doc.data().progress || {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/progress-${examId}`, false);
    });

    return () => unsubscribe();
  }, [user, examId]);

  useEffect(() => {
    const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
    const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
    
    const colors = [
      "text-blue-400 border-blue-400/30 bg-blue-400/10",
      "text-rose-400 border-rose-400/30 bg-rose-400/10",
      "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
      "text-purple-400 border-purple-400/30 bg-purple-400/10",
      "text-amber-400 border-amber-400/30 bg-amber-400/10",
      "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
    ];

    const fonts = ["font-mono", "font-sans", "font-serif"];

    const initial: Subject[] = Object.entries(syllabus).map(([name, chapters], idx) => {
      const subjectData = progressData[name] || {};
      
      // Get default chapters
      const defaultChapters = chapters.map(chName => {
        const prog = subjectData[chName];
        const completed = prog ? (prog.ncert && prog.module && prog.pyq) : false;
        const displayName = prog?.customName || chName;
        return { 
          id: chName, 
          name: displayName, 
          completed 
        };
      });

      // Get custom chapters for this subject
      const customChapters = Object.entries(subjectData)
        .filter(([_, data]: [string, any]) => data.isCustom)
        .map(([id, data]: [string, any]) => ({
          id,
          name: data.customName || id,
          completed: data.ncert && data.module && data.pyq
        }));

      return {
        name,
        color: colors[idx % colors.length],
        font: fonts[idx % fonts.length],
        chapters: [...defaultChapters, ...customChapters]
      };
    });
    setSubjects(initial);
  }, [progressData, category, examId]);

  const totalChapters = subjects.reduce((acc, s) => acc + s.chapters.length, 0);
  const completedChapters = subjects.reduce((acc, s) => acc + s.chapters.filter(c => c.completed).length, 0);
  const totalProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 select-none">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest font-heading">Syllabus Tracker</h3>
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">Read Only</span>
        </div>
        <button 
          className="text-[8px] font-black text-white/20 uppercase tracking-widest cursor-default"
        >
          Syncing with Progress Page
        </button>
      </div>

      {/* Total Progress Bar */}
      <div className="mb-12 p-8 rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 text-center">
        <div className="flex flex-col items-center mb-6">
          <h3 className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black font-heading mb-2">Overall Mission Progress</h3>
          <div className="text-5xl font-black text-white tracking-tighter font-heading text-glow">
            {totalProgress}%
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
              {completedChapters} / {totalChapters} Chapters Mastered
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="h-full bg-gradient-to-r from-blue-500 via-rose-500 to-emerald-500 relative z-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-rose-500/20 to-emerald-500/20 blur-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {subjects.map((subject, sIdx) => (
        <div 
          key={subject.name} 
          className={`w-full rounded-2xl border backdrop-blur-md p-6 flex flex-col h-[550px] transition-all duration-300 hover:scale-[1.02] ${subject.color}`}
        >
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <SubjectIcon name={subject.name} />
            </div>
            <h2 className={`text-xl font-black uppercase tracking-[0.3em] ${subject.font}`}>
              {subject.name}
            </h2>
            <div className="h-1 w-12 bg-current opacity-20 rounded-full" />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-3">
              {subject.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group
                    ${chapter.completed ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'text-white/60 bg-white/5 border border-white/10'}`}
                >
                  {chapter.completed && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span className={`text-sm font-bold leading-tight ${chapter.completed ? '' : ''}`}>
                    {chapter.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] uppercase tracking-widest opacity-60 font-black">Progress</span>
              <span className="text-xl font-black">
                {Math.round((subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(subject.chapters.filter(c => c.completed).length / subject.chapters.length) * 100}%` }}
                className="h-full bg-current rounded-full"
              />
            </div>
          </div>
        </div>
      ))}
      </div>
      <div className="mt-12 p-4 rounded-2xl border border-white/5 bg-white/5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          Note: Completion of <span className="text-emerald-400">NCERT</span>, <span className="text-emerald-400">Module</span>, and <span className="text-emerald-400">PYQ</span> on the Progress Page will automatically tick mark chapters here.
        </p>
      </div>
    </div>
  );
};

export default SubjectChecklist;
