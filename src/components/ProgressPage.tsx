import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, BookOpen, Activity, Plus, Pencil, Trash2, CheckSquare, Square, Check, ChevronUp, ChevronDown, GripVertical, Clock, Target, Info } from 'lucide-react';
import { auth, db, doc, onSnapshot, setDoc, updateDoc, handleFirestoreError, OperationType } from '@/src/firebase';
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
  const [showChapterStats, setShowChapterStats] = useState<string | null>(null);
  const [sessionDelta, setSessionDelta] = useState<any>({});
  const syncTimeoutRef = React.useRef<Record<string, any>>({});

  // Sync with active session for real-time progress visualization without extra writes
  useEffect(() => {
    const syncSession = () => {
      const sessionStr = localStorage.getItem('pulse_active_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          // Safety: If the session data is older than 60 seconds, ignore it (likely a stale tab/crash)
          // This prevents "stale session doubling" where a crashed session's time is added to persistent data
          if (session.lastUpdate && Date.now() - session.lastUpdate < 60000) {
            setSessionDelta(session);
          } else {
            console.log("ProgressPage: Stale session detected, ignoring live delta.");
            setSessionDelta({});
          }
        } catch (e) {
          setSessionDelta({});
        }
      } else {
        setSessionDelta({});
      }
    };
    syncSession();
    const interval = setInterval(syncSession, 2000); // 2s poll
    return () => clearInterval(interval);
  }, []);

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

  const subjects = React.useMemo(() => 
    Object.keys(SYLLABUS_DATA[examInfo.id] || SYLLABUS_DATA[examInfo.id.split('_')[0]] || SYLLABUS_DATA.jee),
    [examInfo.id]
  );

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

    // Optimistically update pulse state
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
        level: levels[0],
        studyTime: 0,
        questions: 0
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

    // Debounce Firestore Write - Especially for sliders
    const syncKey = `${subject}-${chapterId}-${field}`;
    if (syncTimeoutRef.current[syncKey]) {
      clearTimeout(syncTimeoutRef.current[syncKey]);
    }

    syncTimeoutRef.current[syncKey] = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'data', `progress-${examInfo.id}`);
        await updateDoc(docRef, {
          [`progress.${subject}.${chapterId}.${field}`]: value
        }).catch(async (err) => {
          if (err.code === 'not-found' || err.message.includes('not found')) {
             await setDoc(docRef, { 
               progress: { [subject]: { [chapterId]: newProgress[subject][chapterId] } } 
             }, { merge: true });
          } else {
            throw err;
          }
        });
      } catch (error) {
        console.error("Progress Sync Error:", error);
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/progress-${examInfo.id}`, false);
      }
    }, 2000); // 2-second debounce for all progress updates
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

  const calculateSubjectProgress = React.useCallback((subject: string) => {
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
        // Skip if hidden
        if (hiddenChapters[subject]?.includes(id)) return;

        let chapterProgress = 0;
        // 1. Theory & Lectures (15%)
        chapterProgress += (prog.theoryLecture || 0) * 0.15;

        // 2. Module Completion (15%)
        chapterProgress += (prog.module ? 15 : 0);

        // 3. PYQ Progress (30% total)
        // Part A: Basic checklist (15%)
        let pyqCheckProg = 0;
        if (prog.pyqMains) pyqCheckProg += 7.5;
        if (prog.pyqAdvanced) pyqCheckProg += 7.5;
        if (!prog.pyqMains && !prog.pyqAdvanced && prog.pyq) pyqCheckProg = 15;
        chapterProgress += pyqCheckProg;

        // Part B: Specific Years (15% - target 3 years)
        const yearsCompleted = (prog.pyqMainsYears || []).length + (prog.pyqAdvancedYears || []).length;
        chapterProgress += Math.min(15, (yearsCompleted / 3) * 15);

        // 4. Revision (20% - target 3 revisions)
        const revisions = prog.revisionCount || 0;
        chapterProgress += Math.min(20, (revisions / 3) * 20);

        // 5. Study Effort (20% - Live Session & History)
        const activeSub = localStorage.getItem('pulse_selected_subject');
        const activeProp = localStorage.getItem('pulse_selected_chapter');
        
        let liveTime = 0;
        let liveQuestions = 0;
        if (activeSub === subject && activeProp === id && sessionDelta.isRunning) {
          // IMPORTANT: Use chapter-specific seconds from the live session mirror, NOT the total session studySeconds
          // This avoids the "Chapter A" time being added to "Chapter B" if the user switches mid-session.
          liveTime = sessionDelta.chapterSeconds || 0;
          liveQuestions = sessionDelta.questionsSolved || 0;
        }

        const totalTime = (prog.studyTime || 0) + liveTime;
        const totalQ = (prog.questions || 0) + liveQuestions;
        
        // Target: 4 hours study (10%) and 40 questions (10%)
        const effortScore = Math.min(10, (totalTime / 14400) * 10) + Math.min(10, (totalQ / 40) * 10);
        chapterProgress += effortScore;

        totalProgress += chapterProgress;
      }
    });

    return Math.round(totalProgress / allChapterIds.length);
  }, [progressData, examInfo.id, hiddenChapters, sessionDelta]);

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
                                   <div 
                                     key={i}
                                     className={`w-${4-i} h-${3-i} bg-gradient-to-r from-orange-500 via-red-500 to-transparent blur-[2px] rounded-full animate-pulse`}
                                     style={{ animationDelay: `${i * 0.1}s` }}
                                   />
                                 ))}
                               </div>
                             )}

                            {/* Speed Lines */}
                            {progress > 0 && (
                              <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-around">
                                {[...Array(3)].map((_, i) => (
                                  <div 
                                    key={i}
                                    className="w-8 h-px bg-white/10 animate-pulse"
                                    style={{ animationDelay: `${i * 0.1}s` }}
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
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3 group/name min-w-0">
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <h4 
                                      className={`font-bold text-lg ${isFullyMastered ? 'text-emerald-400' : 'text-white'}`}
                                    >
                                      {displayName}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0">
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
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 py-3 px-4 mt-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 w-full mb-1">
                                  <div className="flex items-center gap-3 border-r border-white/5 pr-6 w-full sm:w-auto">
                                    <div className="p-2 rounded-xl bg-emerald-500/20">
                                      <Clock className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-white uppercase tracking-widest whitespace-nowrap">
                                        {(() => {
                                          const activeSub = localStorage.getItem('pulse_selected_subject');
                                          const activeChap = localStorage.getItem('pulse_selected_chapter');
                                          let liveTime = 0;
                                          if (activeSub === activeSubject && activeChap === chapter.id && sessionDelta.isRunning) {
                                            liveTime = sessionDelta.chapterSeconds || 0;
                                          }
                                          const totalTime = (progress.studyTime || 0) + liveTime;
                                          return `${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`;
                                        })()}
                                      </span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Focused Study</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="p-2 rounded-xl bg-rose-500/20">
                                      <Target className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-white uppercase tracking-widest whitespace-nowrap">
                                        {(() => {
                                          const activeSub = localStorage.getItem('pulse_selected_subject');
                                          const activeChap = localStorage.getItem('pulse_selected_chapter');
                                          let liveQs = 0;
                                          if (activeSub === activeSubject && activeChap === chapter.id && sessionDelta.isRunning) {
                                            liveQs = sessionDelta.questionsSolved || 0;
                                          }
                                          return `${(progress.questions || 0) + liveQs} Questions`;
                                        })()}
                                      </span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Solved Success</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls Group */}
                        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 w-full">
                          {/* Slidebars */}
                          <div className="flex flex-col gap-2 w-full xl:w-64">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Theory & Lecture</span>
                              <span className="text-xs font-bold text-purple-400">{progress.theoryLecture || 0}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={progress.theoryLecture || 0}
                              onChange={(e) => updateProgress(activeSubject, chapter.id, 'theoryLecture', parseInt(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-6">
                            {/* Action Items */}
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => updateProgress(activeSubject, chapter.id, 'module', !progress.module)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${progress.module ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 text-white/30 hover:border-white/40'}`}
                              >
                                {progress.module ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-20" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">Module</span>
                              </button>
                              
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 gap-1">
                                  <button 
                                    onClick={() => updateProgress(activeSubject, chapter.id, 'pyq', !progress.pyq)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${progress.pyq ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-white/20 hover:text-white/40'}`}
                                  >
                                    PYQ
                                  </button>
                                  
                                  {progress.pyq && (
                                    <div className="flex items-center gap-1.5 pr-1">
                                      <div className="w-px h-4 bg-white/10 mx-1" />
                                      {examInfo.category === 'jee' && (
                                        <>
                                          <button
                                            onClick={() => setSubExam('mains')}
                                            className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tight transition-all ${subExam === 'mains' ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/20'}`}
                                          >
                                            MN
                                          </button>
                                          <button
                                            onClick={() => setSubExam('advanced')}
                                            className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tight transition-all ${subExam === 'advanced' ? 'text-rose-400 bg-rose-400/10' : 'text-white/20'}`}
                                          >
                                            AV
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {progress.pyq && (
                                  <div className="grid grid-cols-4 gap-2 p-2 bg-black/20 rounded-xl border border-white/5 min-w-[160px]">
                                    {Array.from({ length: 8 }, (_, i) => 2019 + i).map(year => {
                                      const field = subExam === 'mains' ? 'pyqMainsYears' : 'pyqAdvancedYears';
                                      const currentYears = progress[field] || [];
                                      const isSelected = currentYears.includes(year);
                                      const activeColor = subExam === 'mains' 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'bg-rose-500 border-rose-500 text-white';
                                      
                                      return (
                                        <button
                                          key={year}
                                          onClick={() => {
                                            const newYears = isSelected 
                                              ? currentYears.filter((y: number) => y !== year)
                                              : [...currentYears, year];
                                            updateProgress(activeSubject, chapter.id, field, newYears);
                                          }}
                                          className={`flex items-center justify-center p-2 rounded-lg border text-[10px] font-black transition-all
                                            ${isSelected 
                                              ? activeColor
                                              : 'bg-white/5 border-white/10 text-white/10 hover:border-white/30'}`}
                                        >
                                          {year.toString().slice(-2)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Revision Count - Synced from Protocol */}
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Revision</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black w-4 text-center ${progress.revisionCount > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                                  {progress.revisionCount || 0}
                                </span>
                              </div>
                            </div>
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
