import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, BookOpen, Activity, Plus, Pencil, Trash2, CheckSquare, Square } from 'lucide-react';
import { auth, db, doc, onSnapshot, setDoc, handleFirestoreError, OperationType } from '@/src/firebase';
import { SYLLABUS_DATA } from '@/src/constants/syllabus';
import { playTickSound, playCheckSound } from '@/src/lib/sounds';

interface ChapterProgress {
  theoryLecture: number;
  module: boolean;
  pyq: boolean;
  revisionCount: number;
  level: string;
  customName?: string;
  isCustom?: boolean;
}

interface SubjectProgressData {
  [chapterId: string]: ChapterProgress;
}

const ProgressPage = () => {
  const [user, setUser] = useState(auth.currentUser);
  
  const getExamInfo = () => {
    const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
    const year = localStorage.getItem('pulse_user_year') || '2027';
    return {
      id: `${exam}_${year}`,
      category: exam
    };
  };

  const [examInfo, setExamInfo] = useState(getExamInfo());
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [progressData, setProgressData] = useState<Record<string, SubjectProgressData>>({});
  const [editingChapter, setEditingChapter] = useState<{ subject: string, id: string, name: string } | null>(null);
  const [newChapterName, setNewChapterName] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Sync exam info from localStorage
  useEffect(() => {
    const handleStorage = () => {
      setExamInfo(getExamInfo());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const subjects = Object.keys(SYLLABUS_DATA[examInfo.id] || SYLLABUS_DATA[examInfo.id.split('_')[0]] || SYLLABUS_DATA.jee);

  useEffect(() => {
    if (subjects.length > 0 && !activeSubject) {
      setActiveSubject(subjects[0]);
    }
  }, [subjects]);

  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        setProgressData(doc.data().progress || {});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/progress-${examInfo.id}`, false);
    });

    return () => unsubscribe();
  }, [user, examInfo.id]);

  const updateProgress = async (subject: string, chapterId: string, field: keyof ChapterProgress, value: any) => {
    if (!user) return;

    const newProgress = { ...progressData };
    if (!newProgress[subject]) newProgress[subject] = {};
    if (!newProgress[subject][chapterId]) {
      const levels = getMasteryLevels();
      newProgress[subject][chapterId] = { 
        theoryLecture: 0,
        module: false, 
        pyq: false, 
        revisionCount: 0,
        level: levels[0]
      };
    }

    newProgress[subject][chapterId] = {
      ...newProgress[subject][chapterId],
      [field]: value
    };

    if (typeof value === 'boolean') {
      if (value) playCheckSound();
      else playTickSound();
    } else if (field === 'theoryLecture') {
      if (value === 100) playCheckSound();
    }

    setProgressData(newProgress);

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { progress: newProgress }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`);
    }
  };

  const addChapter = async () => {
    if (!newChapterName.trim() || !user) return;
    
    const chapterId = `custom-${Date.now()}`;
    const subject = activeSubject;
    
    const newProgress = { ...progressData };
    if (!newProgress[subject]) newProgress[subject] = {};
    const levels = getMasteryLevels();
    newProgress[subject][chapterId] = {
      theoryLecture: 0,
      module: false,
      pyq: false,
      revisionCount: 0,
      level: levels[0],
      customName: newChapterName,
      isCustom: true
    };

    setProgressData(newProgress);
    setNewChapterName('');
    playCheckSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { progress: newProgress }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`);
    }
  };

  const deleteChapter = async (subject: string, chapterId: string) => {
    if (!user || !window.confirm('Delete this chapter?')) return;

    const newProgress = { ...progressData };
    if (newProgress[subject]) {
      delete newProgress[subject][chapterId];
    }

    setProgressData(newProgress);
    playTickSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { progress: newProgress });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`);
    }
  };

  const getMasteryLevels = () => {
    const category = examInfo.id.split('_')[0].toLowerCase();
    if (category === 'jee') {
      return ['mains', 'advance'];
    }
    return ['perfect', 'mastery'];
  };

  const masteryLevels = getMasteryLevels();

  const getChapters = () => {
    const category = examInfo.id.split('_')[0].toLowerCase();
    const syllabus = SYLLABUS_DATA[examInfo.id] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
    const defaultChapters = syllabus[activeSubject] || [];
    
    // Combine default chapters with custom ones from progressData
    const subjectData = progressData[activeSubject] || {};
    const customChapters = Object.entries(subjectData)
      .filter(([_, data]) => (data as ChapterProgress).isCustom)
      .map(([id, data]) => ({ id, name: (data as ChapterProgress).customName || id }));

    const allChapters = [
      ...defaultChapters.map(name => ({ id: name, name })),
      ...customChapters
    ];

    return allChapters;
  };

  const chapters = getChapters();

  const calculateSubjectProgress = (subject: string) => {
    const category = examInfo.id.split('_')[0].toLowerCase();
    const syllabus = SYLLABUS_DATA[examInfo.id] || SYLLABUS_DATA[category] || SYLLABUS_DATA.jee;
    const defaultChapters = syllabus[subject] || [];
    
    const subjectData = progressData[subject] || {};
    const customChapters = Object.entries(subjectData)
      .filter(([_, data]) => (data as ChapterProgress).isCustom)
      .map(([id, _]) => id);

    const allChapterIds = [
      ...defaultChapters,
      ...customChapters
    ];

    if (allChapterIds.length === 0) return 0;

    let totalProgress = 0;
    allChapterIds.forEach(id => {
      const prog = subjectData[id];
      if (prog) {
        let chapterProgress = 0;
        chapterProgress += (prog.theoryLecture || 0) * 0.25;
        chapterProgress += (prog.module ? 25 : 0);
        chapterProgress += (prog.pyq ? 25 : 0);
        chapterProgress += (Math.min(prog.revisionCount || 0, 3) / 3) * 25;
        totalProgress += chapterProgress;
      }
    });

    return Math.round(totalProgress / allChapterIds.length);
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4"
          >
            <Activity className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Mission Progress</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter text-center mb-4 font-heading">
            PROGRESS <span className="text-purple-500">TRACKER</span>
          </h1>
          <p className="text-white/40 text-sm max-w-md text-center">
            Master your syllabus chapter by chapter. Track Theory & Lectures, Modules, and PYQs.
          </p>
        </div>

        {/* Preparation Tracker */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
              {examInfo.category.toUpperCase()} Preparation Tracker
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const progress = calculateSubjectProgress(subject);
              return (
                <div key={subject} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{subject}</h4>
                      <div className="text-2xl font-black text-white tracking-tighter">{progress}%</div>
                    </div>
                    <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                      Readiness
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => {
                setActiveSubject(subject);
                playTickSound();
              }}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 border
                ${activeSubject === subject 
                  ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] scale-105' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
            >
              {subject}
            </button>
          ))}
        </div>

        {/* Chapters List */}
        <div className="space-y-4 mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubject}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {chapters.map((chapter) => {
                const progress = progressData[activeSubject]?.[chapter.id] || { 
                  theoryLecture: 0,
                  module: false, 
                  pyq: false, 
                  revisionCount: 0,
                  level: masteryLevels[0]
                };
                const isFullyMastered = progress.theoryLecture === 100 && progress.module && progress.pyq;
                const displayName = progress.customName || chapter.name;

                return (
                  <motion.div 
                    key={chapter.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border transition-all duration-300 p-4 md:p-6
                      ${isFullyMastered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
                  >
                      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] items-center gap-8">
                        {/* Edit & Chapter Name */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="min-w-0 flex-1">
                            {editingChapter?.id === chapter.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingChapter.name}
                                onChange={(e) => setEditingChapter({ ...editingChapter, name: e.target.value })}
                                onBlur={() => {
                                  updateProgress(activeSubject, chapter.id, 'customName', editingChapter.name);
                                  setEditingChapter(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateProgress(activeSubject, chapter.id, 'customName', editingChapter.name);
                                    setEditingChapter(null);
                                  }
                                }}
                                className="bg-white/10 border border-purple-500/50 rounded px-3 py-2 text-white w-full outline-none font-bold"
                              />
                            ) : (
                              <div className="flex items-center gap-3 group min-w-0">
                                <h4 
                                  onClick={() => setEditingChapter({ subject: activeSubject, id: chapter.id, name: displayName })}
                                  className={`font-bold text-lg cursor-pointer hover:text-purple-400 transition-colors truncate flex-1 ${isFullyMastered ? 'text-emerald-400' : 'text-white'}`}
                                >
                                  {displayName}
                                </h4>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setEditingChapter({ subject: activeSubject, id: chapter.id, name: displayName })}
                                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  {progress.isCustom && (
                                    <button 
                                      onClick={() => deleteChapter(activeSubject, chapter.id)}
                                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls Group */}
                        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
                          {/* Slidebars */}
                          <div className="flex flex-col gap-4 w-full md:w-48">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Theory & Lecture</span>
                                <span className="text-[10px] font-bold text-purple-400">{progress.theoryLecture || 0}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="100"
                                value={progress.theoryLecture || 0}
                                onChange={(e) => updateProgress(activeSubject, chapter.id, 'theoryLecture', parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                            </div>
                          </div>

                          {/* Ticks */}
                          <div className="flex items-center gap-4">
                            {[
                              { id: 'module', label: 'Module' },
                              { id: 'pyq', label: 'PYQ' }
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => updateProgress(activeSubject, chapter.id, item.id as any, !progress[item.id as keyof ChapterProgress])}
                                className={`flex items-center gap-2 transition-all
                                  ${progress[item.id as keyof ChapterProgress] 
                                    ? 'text-emerald-400' 
                                    : 'text-white/20 hover:text-white/40'}`}
                              >
                                {progress[item.id as keyof ChapterProgress] ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Revision Count */}
                          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Revisions</span>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => updateProgress(activeSubject, chapter.id, 'revisionCount', Math.max(0, (progress.revisionCount || 0) - 1))}
                                className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <motion.span whileTap={{ scale: 0.8 }}>-</motion.span>
                              </button>
                              <span className="text-xs font-black text-white w-4 text-center">{progress.revisionCount || 0}</span>
                              <button 
                                onClick={() => updateProgress(activeSubject, chapter.id, 'revisionCount', (progress.revisionCount || 0) + 1)}
                                className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <motion.span whileTap={{ scale: 0.8 }}>+</motion.span>
                              </button>
                            </div>
                          </div>

                          {/* Mastery Level */}
                          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10">
                            {masteryLevels.map((lvl) => {
                              const isCompleted = (progress.theoryLecture || 0) === 100 && progress.module && progress.pyq;
                              const isDisabled = !isCompleted;
                              
                              return (
                                <button
                                  key={lvl}
                                  disabled={isDisabled}
                                  onClick={() => updateProgress(activeSubject, chapter.id, 'level', lvl)}
                                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                                    ${progress.level === lvl 
                                      ? (lvl === 'mains' || lvl === 'perfect') ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' :
                                        'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                      : isDisabled ? 'text-white/5 cursor-not-allowed' : 'text-white/20 hover:text-white/40'}`}
                                >
                                  {lvl}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Add New Chapter */}
        <div className="flex items-center gap-4 p-6 rounded-2xl bg-white/5 border border-dashed border-white/10">
          <input 
            type="text"
            placeholder="Add new chapter name..."
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addChapter()}
            className="flex-1 bg-transparent border-none outline-none text-white font-bold placeholder:text-white/10"
          />
          <button 
            onClick={addChapter}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-600 text-white font-black uppercase tracking-widest hover:bg-purple-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
