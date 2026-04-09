import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, BookOpen, Activity, Plus, Pencil, Trash2, CheckSquare, Square } from 'lucide-react';
import { auth, db, doc, onSnapshot, setDoc, handleFirestoreError, OperationType } from '@/src/firebase';
import { SYLLABUS_DATA } from '@/src/constants/syllabus';
import { playTickSound, playCheckSound } from '@/src/lib/sounds';

interface ChapterProgress {
  ncert: boolean;
  module: boolean;
  pyq: boolean;
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
      newProgress[subject][chapterId] = { 
        ncert: false, 
        module: false, 
        pyq: false, 
        level: 'basic'
      };
    }

    newProgress[subject][chapterId] = {
      ...newProgress[subject][chapterId],
      [field]: value
    };

    if (typeof value === 'boolean') {
      if (value) playCheckSound();
      else playTickSound();
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
    newProgress[subject][chapterId] = {
      ncert: false,
      module: false,
      pyq: false,
      level: 'basic',
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
      return ['basic', 'mains', 'advance'];
    }
    return ['basic', 'perfect', 'mastery'];
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
            Master your syllabus chapter by chapter. Track NCERT, Modules, and PYQs.
          </p>
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
                  ncert: false, 
                  module: false, 
                  pyq: false, 
                  level: 'basic'
                };
                const isFullyMastered = progress.ncert && progress.module && progress.pyq;
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
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_220px] items-center gap-6">
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

                        {/* Checklist */}
                        <div className="flex items-center gap-2 justify-center">
                          {[
                            { id: 'ncert', label: 'NCERT' },
                            { id: 'module', label: 'Module' },
                            { id: 'pyq', label: 'PYQ' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => updateProgress(activeSubject, chapter.id, item.id as any, !progress[item.id as keyof ChapterProgress])}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all
                                ${progress[item.id as keyof ChapterProgress] 
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                                  : 'bg-white/5 border-white/10 text-white/20 hover:bg-white/10'}`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Mastery Level */}
                        <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/10 justify-center">
                          {masteryLevels.map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => updateProgress(activeSubject, chapter.id, 'level', lvl)}
                              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                                ${progress.level === lvl 
                                  ? lvl === 'basic' ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                    (lvl === 'mains' || lvl === 'perfect') ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' :
                                    'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                  : 'text-white/20 hover:text-white/40'}`}
                            >
                              {lvl}
                            </button>
                          ))}
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
