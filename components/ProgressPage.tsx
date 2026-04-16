import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, BookOpen, Activity, Plus, Pencil, Trash2, CheckSquare, Square, Check, ChevronUp, ChevronDown, GripVertical, Clock, Target } from 'lucide-react';
import { auth, db, doc, onSnapshot, setDoc, handleFirestoreError, OperationType } from '@/src/firebase';
import { SYLLABUS_DATA } from '@/src/constants/syllabus';
import { playTickSound, playCheckSound } from '@/src/lib/sounds';

interface ChapterProgress {
  theoryLecture: number;
  module: boolean;
  pyqMains: boolean;
  pyqAdvanced: boolean;
  pyqMainsYears?: number[];
  pyqAdvancedYears?: number[];
  revisionCount: number;
  level: string;
  customName?: string;
  isCustom?: boolean;
  pyq?: boolean;
  pyqYears?: number[];
  studyTime?: number; // in seconds
  questions?: number;
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
  const [subExam, setSubExam] = useState(localStorage.getItem('pulse_user_subexam') || 'mains');
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [progressData, setProgressData] = useState<Record<string, SubjectProgressData>>({});
  const [chapterOrder, setChapterOrder] = useState<Record<string, string[]>>({});
  const [hiddenChapters, setHiddenChapters] = useState<Record<string, string[]>>({});
  const [editingChapter, setEditingChapter] = useState<{ subject: string, id: string, name: string } | null>(null);
  const [newChapterName, setNewChapterName] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Sync exam info and subExam from localStorage
  useEffect(() => {
    const handleStorage = () => {
      setExamInfo(getExamInfo());
      setSubExam(localStorage.getItem('pulse_user_subexam') || 'mains');
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
        const data = doc.data();
        setProgressData(data.progress || {});
        setChapterOrder(data.chapterOrder || {});
        setHiddenChapters(data.hiddenChapters || {});
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
        pyqMains: false,
        pyqAdvanced: false,
        pyqMainsYears: [],
        pyqAdvancedYears: [],
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
      pyqMains: false,
      pyqAdvanced: false,
      pyqMainsYears: [],
      pyqAdvancedYears: [],
      revisionCount: 0,
      level: levels[0],
      customName: newChapterName,
      isCustom: true
    };

    // Update order
    const currentOrder = chapterOrder[subject] || getChapters().map(c => c.id);
    const newOrder = [...currentOrder, chapterId];
    const updatedChapterOrder = { ...chapterOrder, [subject]: newOrder };

    setProgressData(newProgress);
    setChapterOrder(updatedChapterOrder);
    setNewChapterName('');
    playCheckSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { 
        progress: newProgress,
        chapterOrder: updatedChapterOrder
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`);
    }
  };

  const deleteChapter = async (subject: string, chapterId: string) => {
    if (!user || !window.confirm('Delete this chapter?')) return;

    const newProgress = { ...progressData };
    const isCustom = newProgress[subject]?.[chapterId]?.isCustom;
    
    let updatedChapterOrder = { ...chapterOrder };
    let updatedHiddenChapters = { ...hiddenChapters };

    if (isCustom) {
      if (newProgress[subject]) {
        delete newProgress[subject][chapterId];
      }
      if (updatedChapterOrder[subject]) {
        updatedChapterOrder[subject] = updatedChapterOrder[subject].filter(id => id !== chapterId);
      }
    } else {
      // Default chapter - hide it
      if (!updatedHiddenChapters[subject]) updatedHiddenChapters[subject] = [];
      if (!updatedHiddenChapters[subject].includes(chapterId)) {
        updatedHiddenChapters[subject].push(chapterId);
      }
      if (updatedChapterOrder[subject]) {
        updatedChapterOrder[subject] = updatedChapterOrder[subject].filter(id => id !== chapterId);
      }
    }

    setProgressData(newProgress);
    setChapterOrder(updatedChapterOrder);
    setHiddenChapters(updatedHiddenChapters);
    playTickSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { 
        progress: newProgress,
        chapterOrder: updatedChapterOrder,
        hiddenChapters: updatedHiddenChapters
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`);
    }
  };

  const moveChapter = async (subject: string, chapterId: string, direction: 'up' | 'down') => {
    if (!user) return;
    
    const currentOrder = chapterOrder[subject] || getChapters().map(c => c.id);
    const index = currentOrder.indexOf(chapterId);
    if (index === -1) return;

    const newOrder = [...currentOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    } else {
      return;
    }

    const updatedChapterOrder = { ...chapterOrder, [subject]: newOrder };
    setChapterOrder(updatedChapterOrder);
    playTickSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`), { 
        chapterOrder: updatedChapterOrder 
      }, { merge: true });
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

    const hidden = hiddenChapters[activeSubject] || [];
    const allChapters = [
      ...defaultChapters.filter(name => !hidden.includes(name)).map(name => ({ id: name, name })),
      ...customChapters
    ];

    // Sort by chapterOrder
    const order = chapterOrder[activeSubject];
    if (order && order.length > 0) {
      return allChapters.sort((a, b) => {
        const indexA = order.indexOf(a.id);
        const indexB = order.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

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
        chapterProgress += (prog.theoryLecture || 0) * 0.2; // 20%
        chapterProgress += (prog.module ? 20 : 0); // 20%
        
        // PYQ Checklist (20% total)
        let pyqCheckProg = 0;
        if (prog.pyqMains) pyqCheckProg += 10;
        if (prog.pyqAdvanced) pyqCheckProg += 10;
        
        // Fallback for legacy data
        if (!prog.pyqMains && !prog.pyqAdvanced && prog.pyq) {
          pyqCheckProg = 20;
        }
        chapterProgress += pyqCheckProg;

        // PYQ Years (20% total, max 3 years per chapter)
        const mainsYears = (prog.pyqMainsYears || []).length;
        const advYears = (prog.pyqAdvancedYears || []).length;
        const totalYears = Math.min(mainsYears + advYears, 3); 
        chapterProgress += (totalYears / 3) * 20;
        
        chapterProgress += (Math.min(prog.revisionCount || 0, 3) / 3) * 20; // 20%
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
              {Object.keys(SYLLABUS_DATA[examInfo.id] || SYLLABUS_DATA[examInfo.id.split('_')[0]] || SYLLABUS_DATA.jee).map((subject) => {
                const progress = calculateSubjectProgress(subject);
                return (
                  <div key={subject} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group">
                    <div className="flex justify-between items-end mb-6 relative z-10">
                      <div>
                        <h4 className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">{subject}</h4>
                        <div className="text-2xl font-black text-white tracking-tighter">{progress}%</div>
                      </div>
                      <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                        Readiness
                      </div>
                    </div>
                    
                    {/* Car Progress Bar UI */}
                    <div className="relative w-full h-16 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center px-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
                      
                      {/* Road Markings */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-around opacity-10">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="w-4 h-0.5 bg-white" />
                        ))}
                      </div>

                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-1 bg-gradient-to-r from-purple-600 to-blue-500 relative"
                      >
                        {/* Car Icon with Fire */}
                        <motion.div 
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20"
                          style={{ x: -10 }}
                        >
                          <div className="relative">
                            {/* Fire Effect */}
                            {progress > 0 && (
                              <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                                {[...Array(3)].map((_, i) => (
                                  <motion.div 
                                    key={i}
                                    animate={{ 
                                      scale: [1, 1.5, 1],
                                      opacity: [0.4, 0.8, 0.4],
                                      x: [0, -10, 0]
                                    }}
                                    transition={{ 
                                      repeat: Infinity, 
                                      duration: 0.2 + (i * 0.1),
                                      ease: "easeOut"
                                    }}
                                    className={`w-${4-i} h-${3-i} bg-gradient-to-r from-orange-500 via-red-500 to-transparent blur-[2px] rounded-full`}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Speed Lines */}
                            {progress > 0 && (
                              <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-around">
                                {[...Array(3)].map((_, i) => (
                                  <motion.div 
                                    key={i}
                                    animate={{ x: [0, -20], opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.3, delay: i * 0.1 }}
                                    className="w-8 h-px bg-white/20"
                                  />
                                ))}
                              </div>
                            )}

                            <div className="bg-white p-2 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.4)] border border-white/50">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                <circle cx="7" cy="17" r="2" />
                                <path d="M9 17h6" />
                                <circle cx="17" cy="17" r="2" />
                              </svg>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>

                      {/* Finish Line */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-1 h-1 bg-white/20 rounded-full" />
                        ))}
                      </div>
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
                  pyqMains: false,
                  pyqAdvanced: false,
                  revisionCount: 0,
                  level: masteryLevels[0]
                };
                const isFullyMastered = progress.theoryLecture === 100 && progress.module && (progress.pyqMains || progress.pyqAdvanced || progress.pyq);
                const displayName = progress.customName || chapter.name || 'Untitled Chapter';
                const pyqYears = Array.from({ length: 8 }, (_, i) => 2019 + i);

                return (
                  <motion.div 
                    key={chapter.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border transition-all duration-300 p-4 md:p-6
                      ${isFullyMastered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}
                  >
                      <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr_auto] items-center gap-6">
                        {/* Reorder Controls */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-purple-500/30 transition-all">
                          <button 
                            onClick={() => moveChapter(activeSubject, chapter.id, 'up')}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-white/20 hover:text-purple-400 transition-all active:scale-90"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col gap-0.5 items-center opacity-20">
                            <div className="w-1 h-1 bg-white rounded-full" />
                            <div className="w-1 h-1 bg-white rounded-full" />
                            <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                          <button 
                            onClick={() => moveChapter(activeSubject, chapter.id, 'down')}
                            className="p-1.5 rounded-lg hover:bg-purple-500/20 text-white/20 hover:text-purple-400 transition-all active:scale-90"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

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
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-3 group/name min-w-0">
                                  <h4 
                                    className={`font-bold text-lg flex-1 ${isFullyMastered ? 'text-emerald-400' : 'text-white'}`}
                                  >
                                    {displayName}
                                  </h4>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setEditingChapter({ subject: activeSubject, id: chapter.id, name: displayName })}
                                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => deleteChapter(activeSubject, chapter.id)}
                                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {/* Chapter Stats */}
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                      {Math.floor((progress.studyTime || 0) / 3600)}h {Math.floor(((progress.studyTime || 0) % 3600) / 60)}m
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Target className="w-3 h-3 text-rose-400" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                      {progress.questions || 0} Questions
                                    </span>
                                  </div>
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
                          <div className="flex flex-wrap items-center gap-6">
                            {[
                              { id: 'module', label: 'Module' }
                            ].map((item) => (
                              <button
                                key={item.id}
                                onClick={() => updateProgress(activeSubject, chapter.id, item.id as any, !progress[item.id as keyof ChapterProgress])}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
                                  ${progress[item.id as keyof ChapterProgress] 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                    : 'bg-white/5 border-white/10 text-white/20 hover:border-white/40'}`}
                              >
                                {progress[item.id as keyof ChapterProgress] ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-20" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                              </button>
                            ))}

                            {/* PYQ Section Updated */}
                            <div className="flex flex-wrap items-center gap-4">
                              {subExam === 'mains' ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => updateProgress(activeSubject, chapter.id, 'pyqMains', !progress.pyqMains)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
                                      ${progress.pyqMains 
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-white/5 border-white/10 text-white/20 hover:border-white/40'}`}
                                  >
                                    {progress.pyqMains ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-20" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mains PYQ</span>
                                  </button>
                                  
                                  {progress.pyqMains && (
                                    <div className="grid grid-cols-4 gap-1 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                      {pyqYears.map(year => {
                                        const isSelected = (progress.pyqMainsYears || []).includes(year);
                                        return (
                                          <button
                                            key={year}
                                            onClick={() => {
                                              const currentYears = progress.pyqMainsYears || [];
                                              const newYears = isSelected 
                                                ? currentYears.filter(y => y !== year)
                                                : [...currentYears, year];
                                              updateProgress(activeSubject, chapter.id, 'pyqMainsYears', newYears);
                                            }}
                                            className={`flex items-center justify-center px-1 py-1 rounded-md border text-[8px] font-black transition-all duration-200
                                              ${isSelected 
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                : 'bg-white/5 border-white/10 text-white/20 hover:border-white/30 hover:text-white/40'}`}
                                          >
                                            {year.toString().slice(-2)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => updateProgress(activeSubject, chapter.id, 'pyqAdvanced', !progress.pyqAdvanced)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
                                      ${progress.pyqAdvanced 
                                        ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                                        : 'bg-white/5 border-white/10 text-white/20 hover:border-white/40'}`}
                                  >
                                    {progress.pyqAdvanced ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-20" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">Advanced PYQ</span>
                                  </button>
                                  
                                  {progress.pyqAdvanced && (
                                    <div className="grid grid-cols-4 gap-1 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                      {pyqYears.map(year => {
                                        const isSelected = (progress.pyqAdvancedYears || []).includes(year);
                                        return (
                                          <button
                                            key={year}
                                            onClick={() => {
                                              const currentYears = progress.pyqAdvancedYears || [];
                                              const newYears = isSelected 
                                                ? currentYears.filter(y => y !== year)
                                                : [...currentYears, year];
                                              updateProgress(activeSubject, chapter.id, 'pyqAdvancedYears', newYears);
                                            }}
                                            className={`flex items-center justify-center px-1 py-1 rounded-md border text-[8px] font-black transition-all duration-200
                                              ${isSelected 
                                                ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                                                : 'bg-white/5 border-white/10 text-white/20 hover:border-white/30 hover:text-white/40'}`}
                                          >
                                            {year.toString().slice(-2)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
                              const isCompleted = (progress.theoryLecture || 0) === 100 && progress.module && (progress.pyqMains || progress.pyqAdvanced || progress.pyq);
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
