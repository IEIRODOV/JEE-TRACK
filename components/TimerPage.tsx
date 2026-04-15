import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Zap, Trash2, Cloud, CloudOff, Loader2, Activity } from 'lucide-react';
import { playTickSound, playF1Sound } from '@/src/lib/sounds';
import { motion, AnimatePresence } from 'motion/react';
import AnoAI from "@/components/ui/animated-shader-background";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, ReferenceLine, PieChart, Pie } from 'recharts';

import { auth, db, onAuthStateChanged, handleFirestoreError, OperationType } from '@/src/firebase';
import PulseLoader from "@/components/ui/pulse-loader";
import { SYLLABUS_DATA } from '@/src/constants/syllabus';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  writeBatch,
  increment,
  addDoc
} from 'firebase/firestore';

const SUBJECT_COLORS: Record<string, string> = {
  'Maths': '#3b82f6',
  'Math': '#3b82f6',
  'Physics': '#a855f7',
  'Chemistry': '#10b981',
  'Bio': '#f43f5e',
  'Science': '#06b6d4',
  'Social Science': '#f59e0b',
  'No Data': 'rgba(255,255,255,0.05)'
};

const getSubjectColor = (subject: string, index: number) => {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  const defaultColors = ['#a855f7', '#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#06b6d4'];
  return defaultColors[index % defaultColors.length];
};

const TimerPage = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mockTestDates, setMockTestDates] = useState<string[]>([]);
  const [mockTestDetails, setMockTestDetails] = useState<Record<string, { completed: boolean, marks: string }>>({});
  const [completedStudyDays, setCompletedStudyDays] = useState<string[]>([]);
  const [completedQuestionDays, setCompletedQuestionDays] = useState<string[]>([]);
  const [dailyQuestionCounts, setDailyQuestionCounts] = useState<Record<string, number>>({});
  const [dailyStudySeconds, setDailyStudySeconds] = useState<Record<string, number>>({});
  const [subjectStudySeconds, setSubjectStudySeconds] = useState<Record<string, Record<string, number>>>({});
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, Record<string, number>>>({});
  const [globalStats, setGlobalStats] = useState({ totalStudents: 0, totalQuestions: 0 });
  
  const [targetHours, setTargetHours] = useState<number>(6);
  const [questionTarget, setQuestionTarget] = useState<number>(50);
  
  const [currentQuestions, setCurrentQuestions] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<string>(localStorage.getItem('pulse_selected_subject') || '');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [isTimerLoading, setIsTimerLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Refs to avoid stale closures in timer and async operations
  const dailyStudySecondsRef = useRef(dailyStudySeconds);
  const completedStudyDaysRef = useRef(completedStudyDays);
  const targetHoursRef = useRef(targetHours);
  const subjectStudySecondsRef = useRef(subjectStudySeconds);
  const subjectQuestionCountsRef = useRef(subjectQuestionCounts);
  const selectedSubjectRef = useRef(selectedSubject);
  const currentQuestionsRef = useRef(currentQuestions);
  const elapsedSecondsRef = useRef(elapsedSeconds);

  useEffect(() => {
    dailyStudySecondsRef.current = dailyStudySeconds;
    completedStudyDaysRef.current = completedStudyDays;
    targetHoursRef.current = targetHours;
    subjectStudySecondsRef.current = subjectStudySeconds;
    subjectQuestionCountsRef.current = subjectQuestionCounts;
    selectedSubjectRef.current = selectedSubject;
    currentQuestionsRef.current = currentQuestions;
    elapsedSecondsRef.current = elapsedSeconds;
  }, [dailyStudySeconds, completedStudyDays, targetHours, subjectStudySeconds, subjectQuestionCounts, selectedSubject, currentQuestions, elapsedSeconds]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time sync from Firestore or localStorage
  useEffect(() => {
    if (!user) {
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      const newQuestionCounts: Record<string, number> = {};
      const newStudySeconds: Record<string, number> = {};
      const newMockTestDates: string[] = [];
      const newMockTestDetails: Record<string, { completed: boolean, marks: string }> = {};
      const newCompletedStudy: string[] = [];
      const newCompletedQuestions: string[] = [];

      Object.entries(localData).forEach(([dateStr, data]: [string, any]) => {
        if (data.questionsSolved !== undefined) newQuestionCounts[dateStr] = data.questionsSolved;
        if (data.studySeconds !== undefined) newStudySeconds[dateStr] = data.studySeconds;
        
        if (data.isMockTest) {
          newMockTestDates.push(dateStr);
          newMockTestDetails[dateStr] = {
            completed: data.mockTestCompleted || false,
            marks: data.mockTestMarks || ''
          };
        }

        if (data.studySeconds >= targetHours * 3600) {
          newCompletedStudy.push(dateStr);
        }
        if (data.questionsSolved >= questionTarget) {
          newCompletedQuestions.push(dateStr);
        }
      });

      setDailyQuestionCounts(newQuestionCounts);
      setDailyStudySeconds(newStudySeconds);
      setMockTestDates(newMockTestDates);
      setMockTestDetails(newMockTestDetails);
      setCompletedStudyDays(newCompletedStudy);
      setCompletedQuestionDays(newCompletedQuestions);

      const today = new Date().toDateString();
      setCurrentQuestions(newQuestionCounts[today] || 0);
      setElapsedSeconds(newStudySeconds[today] || 0);
      
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const statsRef = collection(db, 'users', user.uid, 'dailyStats');
    
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      const newQuestionCounts: Record<string, number> = {};
      const newStudySeconds: Record<string, number> = {};
      const newSubjectSeconds: Record<string, Record<string, number>> = {};
      const newSubjectQuestions: Record<string, Record<string, number>> = {};
      const newMockTestDates: string[] = [];
      const newMockTestDetails: Record<string, { completed: boolean, marks: string }> = {};
      const newCompletedStudy: string[] = [];
      const newCompletedQuestions: string[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const dateStr = doc.id; // Using doc ID as date string

        if (data.questionsSolved !== undefined) newQuestionCounts[dateStr] = data.questionsSolved;
        if (data.studySeconds !== undefined) newStudySeconds[dateStr] = data.studySeconds;
        if (data.subjectSeconds !== undefined) newSubjectSeconds[dateStr] = data.subjectSeconds;
        if (data.subjectQuestions !== undefined) newSubjectQuestions[dateStr] = data.subjectQuestions;
        
        if (data.isMockTest) {
          newMockTestDates.push(dateStr);
          newMockTestDetails[dateStr] = {
            completed: data.mockTestCompleted || false,
            marks: data.mockTestMarks || ''
          };
        }

        if (data.studySeconds >= targetHoursRef.current * 3600) {
          newCompletedStudy.push(dateStr);
        }
        if (data.questionsSolved >= questionTarget) {
          newCompletedQuestions.push(dateStr);
        }
      });

      setDailyQuestionCounts(newQuestionCounts);
      setDailyStudySeconds(newStudySeconds);
      setSubjectStudySeconds(newSubjectSeconds);
      setSubjectQuestionCounts(newSubjectQuestions);
      setMockTestDates(newMockTestDates);
      setMockTestDetails(newMockTestDetails);
      setCompletedStudyDays(newCompletedStudy);
      setCompletedQuestionDays(newCompletedQuestions);

      // Update current day's values
      const today = new Date().toDateString();
      setCurrentQuestions(newQuestionCounts[today] || 0);
      
      // Only set elapsed seconds if the timer is not running to avoid flicker
      if (!isTimerRunning) {
        setElapsedSeconds(newStudySeconds[today] || 0);
      }

      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, (error) => {
      console.error("Firestore Sync Error:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user, questionTarget]);

  // Timer State Sync from Firestore or localStorage
  useEffect(() => {
    if (!user) {
      const localTimer = localStorage.getItem('pulse_timer_state');
      if (localTimer) {
        const data = JSON.parse(localTimer);
        setIsTimerRunning(data.isRunning || false);
        setStartTime(data.startTime || null);
        setAccumulatedSeconds(data.accumulatedSeconds || 0);
      }
      setIsTimerLoading(false);
      return;
    }

    const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
    const unsubscribe = onSnapshot(timerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsTimerRunning(data.isRunning || false);
        setStartTime(data.startTime || null);
        setAccumulatedSeconds(data.accumulatedSeconds || 0);
      }
      setIsTimerLoading(false);
    }, (error) => {
      console.error("Timer Sync Error:", error);
      setIsTimerLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Global Stats Listener
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as any);
      }
    }, (error) => {
      console.error("Global Stats Sync Error:", error);
    });
    return () => unsubscribe();
  }, []);

  // Load available subjects from syllabus
  useEffect(() => {
    const exam = (localStorage.getItem('pulse_user_exam') || 'jee').toLowerCase();
    const year = localStorage.getItem('pulse_user_year') || '2027';
    const subExam = localStorage.getItem('pulse_user_subexam') || 'mains';
    const examId = exam === 'jee' ? `jee_${subExam}_${year}` : `${exam}_${year}`;
    
    const normalizedExamId = examId.includes('boards') && !examId.endsWith('th') ? `${examId}th` : examId;
    const syllabus = SYLLABUS_DATA[normalizedExamId] || SYLLABUS_DATA[examId] || SYLLABUS_DATA[exam] || SYLLABUS_DATA.jee;
    
    const subjects = Object.keys(syllabus);
    setAvailableSubjects(subjects);
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
      localStorage.setItem('pulse_selected_subject', subjects[0]);
    }
  }, [selectedSubject]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let periodicSave: NodeJS.Timeout;

    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        
        setElapsedSeconds(totalElapsed);
        
        const today = new Date().toDateString();
        const newSeconds = { ...dailyStudySecondsRef.current, [today]: totalElapsed };
        setDailyStudySeconds(newSeconds);

        // Update subject distribution state
        const currentSub = selectedSubjectRef.current;
        if (currentSub) {
          setSubjectStudySeconds(prev => {
            const todaySubjects = prev[today] || {};
            const prevSubjectSeconds = todaySubjects[currentSub] || 0;
            // We only add 1 second per tick
            return {
              ...prev,
              [today]: {
                ...todaySubjects,
                [currentSub]: prevSubjectSeconds + 1
              }
            };
          });
        }

        if (totalElapsed >= targetHoursRef.current * 3600 && !completedStudyDaysRef.current.includes(today)) {
          setCompletedStudyDays(prev => [...prev, today]);
        }
      }, 1000);

      // Periodic save to Firestore every 30 seconds to prevent data loss
      periodicSave = setInterval(async () => {
        const today = new Date().toDateString();
        const now = Date.now();
        const sessionSeconds = Math.floor((now - startTime) / 1000);
        const totalElapsed = accumulatedSeconds + sessionSeconds;
        
        const currentSubjectSeconds = subjectStudySecondsRef.current[today] || {};

        await saveToFirestore(today, {
          studySeconds: totalElapsed,
          subjectSeconds: currentSubjectSeconds,
          date: today
        });
      }, 30000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(periodicSave);
    };
  }, [isTimerRunning, startTime, accumulatedSeconds, selectedSubject]);

  const saveToFirestore = async (dateStr: string, data: any) => {
    if (!user) {
      // Update local state immediately for guest users
      if (data.questionsSolved !== undefined) {
        setDailyQuestionCounts(prev => ({ ...prev, [dateStr]: data.questionsSolved }));
        if (data.questionsSolved >= questionTarget) {
          setCompletedQuestionDays(prev => Array.from(new Set([...prev, dateStr])));
        }
      }
      if (data.studySeconds !== undefined) {
        setDailyStudySeconds(prev => ({ ...prev, [dateStr]: data.studySeconds }));
        if (data.studySeconds >= targetHours * 3600) {
          setCompletedStudyDays(prev => Array.from(new Set([...prev, dateStr])));
        }
      }
      if (data.isMockTest !== undefined) {
        if (data.isMockTest) {
          setMockTestDates(prev => Array.from(new Set([...prev, dateStr])));
        } else {
          setMockTestDates(prev => prev.filter(d => d !== dateStr));
        }
      }
      if (data.mockTestCompleted !== undefined || data.mockTestMarks !== undefined) {
        setMockTestDetails(prev => ({
          ...prev,
          [dateStr]: {
            completed: data.mockTestCompleted ?? prev[dateStr]?.completed ?? false,
            marks: data.mockTestMarks ?? prev[dateStr]?.marks ?? ''
          }
        }));
      }

      // Save to localStorage
      const localData = JSON.parse(localStorage.getItem('pulse_calendar_data') || '{}');
      localData[dateStr] = { ...(localData[dateStr] || {}), ...data };
      localStorage.setItem('pulse_calendar_data', JSON.stringify(localData));
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid, 'dailyStats', dateStr);
      await setDoc(docRef, {
        ...data,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const saveTimerState = async (running: boolean, start: number | null, accumulated: number) => {
    if (!user) {
      localStorage.setItem('pulse_timer_state', JSON.stringify({
        isRunning: running,
        startTime: start,
        accumulatedSeconds: accumulated
      }));
      return;
    }
    try {
      const timerRef = doc(db, 'users', user.uid, 'data', 'timer');
      await setDoc(timerRef, {
        isRunning: running,
        startTime: start,
        accumulatedSeconds: accumulated,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving timer state:", error);
    }
  };

  const calculateStreak = (secondsMap: Record<string, number>, target: number) => {
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const targetSeconds = target * 3600;

    const todayStr = checkDate.toDateString();
    const todaySeconds = secondsMap[todayStr] || 0;

    // If today's goal isn't met, check if yesterday's was. If not, streak is 0.
    if (todaySeconds < targetSeconds) {
      const yesterday = new Date(checkDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      if ((secondsMap[yesterdayStr] || 0) < targetSeconds) return 0;
      // If yesterday was met, start counting from yesterday
      checkDate = yesterday;
    }

    while (true) {
      const dateStr = checkDate.toDateString();
      const seconds = secondsMap[dateStr] || 0;
      if (seconds >= targetSeconds) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const syncGlobalProgress = async (questions: number, hours: number) => {
    if (!user) return;
    try {
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      const leaderboardSnap = await getDoc(leaderboardRef);
      const isNewUser = !leaderboardSnap.exists();

      const newStreak = calculateStreak(dailyStudySeconds, targetHours);

      // Update Leaderboard
      await setDoc(leaderboardRef, {
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`,
        totalQuestions: increment(questions),
        totalHours: increment(hours),
        streak: newStreak, // Accurate streak based on study hours
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Update Global Stats
      const globalStatsRef = doc(db, 'stats', 'global');
      await setDoc(globalStatsRef, {
        totalStudents: increment(isNewUser ? 1 : 0),
        totalQuestions: increment(questions),
        totalHours: increment(hours),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Add Activity
      if (questions > 0) {
        await addDoc(collection(db, 'activity'), {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          action: `solved ${questions} questions`,
          type: 'questions',
          value: questions,
          createdAt: serverTimestamp()
        });
      }
      if (hours > 0) {
        await addDoc(collection(db, 'activity'), {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          action: `completed ${hours.toFixed(1)}h study`,
          type: 'hours',
          value: hours,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Global sync error:", error);
    }
  };

  const toggleTimer = async () => {
    playF1Sound();
    const today = new Date().toDateString();
    if (!isTimerRunning) {
      const now = Date.now();
      const newAccumulated = elapsedSeconds;
      setStartTime(now);
      setAccumulatedSeconds(newAccumulated);
      setIsTimerRunning(true);
      await saveTimerState(true, now, newAccumulated);
    } else {
      setIsTimerRunning(false);
      setStartTime(null);
      setAccumulatedSeconds(0);
      await saveTimerState(false, null, 0);
      
      const sessionHours = (elapsedSeconds - accumulatedSeconds) / 3600;
      if (sessionHours > 0) {
        await syncGlobalProgress(0, sessionHours);
      }

      // Final save on stop
      const currentSubjectSeconds = subjectStudySecondsRef.current[today] || {};
      await saveToFirestore(today, {
        studySeconds: elapsedSeconds,
        subjectSeconds: currentSubjectSeconds,
        date: today
      });
    }
  };

  const updateQuestions = async (val: number) => {
    const diff = val - currentQuestionsRef.current;
    const today = new Date().toDateString();
    setCurrentQuestions(val);
    
    const newCounts = { ...dailyQuestionCounts, [today]: val };
    setDailyQuestionCounts(newCounts);

    // Update subject-wise question counts
    let updatedSubjectQuestions = { ...(subjectQuestionCountsRef.current[today] || {}) };
    const currentSub = selectedSubjectRef.current;
    if (currentSub) {
      const prevSubCount = updatedSubjectQuestions[currentSub] || 0;
      updatedSubjectQuestions[currentSub] = Math.max(0, prevSubCount + diff);
      setSubjectQuestionCounts(prev => ({
        ...prev,
        [today]: updatedSubjectQuestions
      }));
    }

    await saveToFirestore(today, {
      questionsSolved: val,
      subjectQuestions: updatedSubjectQuestions,
      date: today
    });

    if (diff > 0) {
      await syncGlobalProgress(diff, 0);
    }
  };

  const toggleMockTest = async (dateStr: string) => {
    const isCurrentlyMock = mockTestDates.includes(dateStr);
    
    if (isCurrentlyMock) {
      await deleteMockTest(dateStr);
    } else {
      await saveToFirestore(dateStr, {
        isMockTest: true,
        date: dateStr
      });
    }
  };

  const updateMockTestDetail = async (dateStr: string, completed: boolean, marks: string) => {
    await saveToFirestore(dateStr, {
      mockTestCompleted: completed,
      mockTestMarks: marks,
      isMockTest: true,
      date: dateStr
    });
  };

  const deleteMockTest = async (dateStr: string) => {
    await saveToFirestore(dateStr, {
      isMockTest: false,
      mockTestCompleted: false,
      mockTestMarks: '',
      date: dateStr
    });
  };

  const chartData = (Object.entries(mockTestDetails) as [string, { completed: boolean, marks: string }][])
    .filter(([_, details]) => details.completed && !isNaN(Number(details.marks)) && details.marks.trim() !== '')
    .map(([dateStr, details]) => ({
      date: new Date(dateStr).toLocaleDateString('default', { day: 'numeric', month: 'short' }),
      timestamp: new Date(dateStr).getTime(),
      marks: Number(details.marks)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthStudySeconds = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = new Date(year, month, d).toDateString();
    return dailyStudySeconds[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthQuestionCount = Array.from({ length: totalDays }, (_, i) => {
    const d = i + 1;
    const dateStr = new Date(year, month, d).toDateString();
    return dailyQuestionCounts[dateStr] || 0;
  }).reduce((a, b) => a + b, 0);

  const monthStudyHours = (monthStudySeconds / 3600).toFixed(1);

  const barChartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    return {
      name: d.toLocaleDateString('default', { weekday: 'short' }),
      hours: Number(((dailyStudySeconds[dateStr] || 0) / 3600).toFixed(1)),
      questions: dailyQuestionCounts[dateStr] || 0,
      fullDate: dateStr
    };
  });

  const renderDay = (d: number, m: number, y: number, key: string) => {
    const date = new Date(y, m, d);
    const dateStr = date.toDateString();
    const isToday = new Date().toDateString() === dateStr;
    const isQuestionMet = completedQuestionDays.includes(dateStr);
    const isStudyMet = completedStudyDays.includes(dateStr);
    const isMockTest = mockTestDates.includes(dateStr);
    const studySeconds = dailyStudySeconds[dateStr] || 0;
    const studyHours = (studySeconds / 3600).toFixed(1);
    const questionCount = dailyQuestionCounts[dateStr] || 0;
    const hasActivity = studySeconds > 0 || questionCount > 0;

    return (
      <div 
        key={key} 
        onClick={() => toggleMockTest(dateStr)}
        className={`h-14 md:h-16 border border-white/10 p-1 transition-all duration-300 hover:scale-[1.05] hover:z-20 hover:border-white/40 group relative cursor-pointer
          ${isToday ? 'bg-white/10 border-purple-500/50 ring-1 ring-purple-500/20' : 'bg-white/2'}
          ${isQuestionMet && !isStudyMet ? 'bg-pink-500/10' : ''}
          ${isStudyMet && !isQuestionMet ? 'bg-emerald-500/10' : ''}
          ${isQuestionMet && isStudyMet ? 'bg-gradient-to-br from-pink-500/15 to-emerald-500/15' : ''}
          ${isMockTest ? 'border-blue-500/50 bg-blue-500/5' : ''}
          ${hasActivity ? 'shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]' : ''}`}
      >
        <div className="flex justify-between items-start relative z-10">
          <span className={`text-xs font-bold ${isToday ? 'text-purple-400' : 'text-white/80'}`}>
            {d}
          </span>
          <div className="flex flex-col gap-0.5 items-end">
            {isToday && (
              <div className="w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,1)]" />
            )}
            {isQuestionMet && (
              <div className="w-1 h-1 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,1)]" />
            )}
            {isStudyMet && (
              <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,1)]" />
            )}
            {isMockTest && (
              <div className="flex flex-col items-end">
                <div className="w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter mt-0.5">Test</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0 z-10">
          {studySeconds > 0 && (
            <span className="text-[9px] font-black text-emerald-400/90 leading-none group-hover:text-emerald-400 transition-colors">
              {studyHours}h
            </span>
          )}
          {questionCount > 0 && (
            <span className="text-[9px] font-black text-rose-400/90 leading-none group-hover:text-rose-400 transition-colors">
              {questionCount}Q
            </span>
          )}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Click to tag</span>
        </div>
        
        {hasActivity && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] flex">
            {studySeconds > 0 && (
              <div 
                className="h-full bg-emerald-500/50" 
                style={{ width: `${(studySeconds > 0 && questionCount > 0) ? '50%' : '100%'}` }} 
              />
            )}
            {questionCount > 0 && (
              <div 
                className="h-full bg-rose-500/50" 
                style={{ width: `${(studySeconds > 0 && questionCount > 0) ? '50%' : '100%'}` }} 
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const days = [];

  if (viewMode === 'month') {
    // Fill empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 md:h-20 border border-white/5 bg-white/2 opacity-20" />);
    }

    // Fill days of current month
    for (let d = 1; d <= totalDays; d++) {
      days.push(renderDay(d, month, year, `day-${d}`));
    }
  } else {
    // Week view logic
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(renderDay(d.getDate(), d.getMonth(), d.getFullYear(), `week-day-${i}`));
    }
  }

  const deleteOneHour = async () => {
    if (!user) return;
    const today = new Date().toDateString();
    const currentSeconds = dailyStudySeconds[today] || 0;
    const newSeconds = Math.max(0, currentSeconds - 3600);
    
    setDailyStudySeconds(prev => ({ ...prev, [today]: newSeconds }));
    setElapsedSeconds(newSeconds);
    setShowDeleteConfirm(false);
    playTickSound();

    try {
      await setDoc(doc(db, 'users', user.uid, 'dailyStats', today), {
        studySeconds: newSeconds
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/dailyStats/${today}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-black overflow-x-hidden relative">
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[32px] max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Delete 1 Hour?</h3>
              <p className="text-sm text-white/40 mb-8">This will subtract 1 hour from your today's study time. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteOneHour}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center pt-16 pb-24 px-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter font-heading uppercase">{monthName} {year}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-white/40 tracking-[0.3em] uppercase text-[9px] font-bold">Study Schedule</p>
                  <div className="h-3 w-px bg-white/10 mx-1" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest">
                      {globalStats.totalStudents.toLocaleString()} Students Online
                    </span>
                  </div>
                  {isSyncing ? (
                    <PulseLoader size={12} />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-400/50" />
                      {lastSyncTime && (
                        <span className="text-[8px] text-white/20 font-bold uppercase">
                          Synced {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-xl">
              <button 
                onClick={() => setViewMode('month')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                  ${viewMode === 'month' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                  ${viewMode === 'week' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Trackers Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Stopwatch Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-[40px] bg-black border border-white/10 flex flex-col items-center justify-center text-center group relative overflow-hidden"
            >
              {/* RGB Border Animation */}
              <div className="absolute inset-0 p-[2px] overflow-hidden">
                <motion.div
                  animate={{ 
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000)] opacity-20"
                />
              </div>
              {/* Fast Moving White Light Border */}
              {isTimerRunning && (
                <div className="absolute inset-0 p-[2px] overflow-hidden">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_160deg,#ffffff_180deg,transparent_200deg,transparent_360deg)] opacity-60"
                  />
                </div>
              )}
              <div className="absolute inset-[1px] bg-black rounded-[39px] z-0" />

              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="flex flex-col w-full mb-8">
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Focus Subject</div>
                  <div className="flex flex-wrap gap-2">
                    {availableSubjects.map(sub => (
                      <button
                        key={sub}
                        onClick={() => {
                          if (!isTimerRunning) {
                            setSelectedSubject(sub);
                            localStorage.setItem('pulse_selected_subject', sub);
                          }
                        }}
                        disabled={isTimerRunning}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                          ${selectedSubject === sub 
                            ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}
                          ${isTimerRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative mb-8">
                  {isTimerLoading ? (
                    <PulseLoader size={48} />
                  ) : (
                    <div className="relative">
                      {isTimerRunning && (
                        <>
                          <motion.div
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [0.2, 0.5, 0.2]
                            }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2"
                          >
                            <Activity className="w-6 h-6 text-red-500" />
                          </motion.div>
                        </>
                      )}
                      <div className="flex flex-col items-center">
                        <div className="text-6xl font-mono font-black text-white tracking-tighter tabular-nums relative">
                          {formatTime(elapsedSeconds)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full">
                  <button 
                    onClick={toggleTimer}
                    disabled={isTimerLoading}
                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2
                      ${isTimerRunning ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}
                  >
                    {isTimerRunning && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      >
                        <Activity className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {isTimerLoading ? 'Syncing...' : (isTimerRunning ? 'Stop Session' : 'Start Session')}
                  </button>
                  
                  {!isTimerRunning && !isTimerLoading && elapsedSeconds >= 3600 && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
                      title="Delete 1 Hour"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Question Tracker Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-[40px] bg-black border border-white/10 flex flex-col items-center justify-center text-center group relative overflow-hidden"
            >
              {/* RGB Border Animation */}
              <div className="absolute inset-0 p-[2px] overflow-hidden">
                <motion.div
                  animate={{ 
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#00ffd5,#002bff,#7a00ff,#ff00c8,#ff0000,#ff7300,#fffb00,#48ff00,#00ffd5)] opacity-20"
                />
              </div>
              <div className="absolute inset-[1px] bg-black rounded-[39px] z-0" />

              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Questions Solved</div>
                <div className="text-6xl font-mono font-black text-white tracking-tighter mb-8 tabular-nums">
                  {currentQuestions}
                </div>
                <div className="flex items-center gap-4 w-full">
                  <button 
                    onClick={() => {
                      playTickSound();
                      updateQuestions(Math.max(0, currentQuestions - 1));
                    }}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95"
                  >
                    -
                  </button>
                  <button 
                    onClick={() => {
                      playTickSound();
                      updateQuestions(currentQuestions + 1);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Subject Time Distribution */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[40px] glass border border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-8">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Subject Time Distribution</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const today = new Date().toDateString();
                          const todaySubjects = subjectStudySeconds[today] || {};
                          const data = Object.entries(todaySubjects).map(([name, seconds]) => ({
                            name,
                            value: seconds
                          }));
                          return data.length > 0 ? data : [{ name: 'No Data', value: 1 }];
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(() => {
                          const today = new Date().toDateString();
                          const todaySubjects = subjectStudySeconds[today] || {};
                          const data = Object.entries(todaySubjects);
                          if (data.length === 0) {
                            return <Cell fill="rgba(255,255,255,0.05)" stroke="none" />;
                          }
                          return data.map(([name, _], index) => (
                            <Cell key={`cell-${index}`} fill={getSubjectColor(name, index)} stroke="none" />
                          ));
                        })()}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                        formatter={(value: number) => [`${(value / 3600).toFixed(1)}h`, 'Time']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-mono font-black text-white">
                      {((dailyStudySeconds[new Date().toDateString()] || 0) / 3600).toFixed(1)}h
                    </span>
                  </div>
                </div>

                <div className="w-full mt-6 space-y-2">
                  {(() => {
                    const today = new Date().toDateString();
                    const todaySubjects = subjectStudySeconds[today] || {};
                    return Object.entries(todaySubjects).map(([name, seconds], index) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(name, index) }} />
                          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white">{(Number(seconds) / 3600).toFixed(1)}h</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>

            {/* Subject Question Distribution */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[40px] glass border border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-8">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Subject Question Distribution</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const today = new Date().toDateString();
                          const todaySubjects = subjectQuestionCounts[today] || {};
                          const data = Object.entries(todaySubjects).map(([name, count]) => ({
                            name,
                            value: count
                          }));
                          return data.length > 0 ? data : [{ name: 'No Data', value: 1 }];
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(() => {
                          const today = new Date().toDateString();
                          const todaySubjects = subjectQuestionCounts[today] || {};
                          const data = Object.entries(todaySubjects);
                          if (data.length === 0) {
                            return <Cell fill="rgba(255,255,255,0.05)" stroke="none" />;
                          }
                          return data.map(([name, _], index) => (
                            <Cell key={`cell-q-${index}`} fill={getSubjectColor(name, index)} stroke="none" />
                          ));
                        })()}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                        formatter={(value: number) => [value, 'Questions']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total</span>
                    <span className="text-2xl font-mono font-black text-white">
                      {dailyQuestionCounts[new Date().toDateString()] || 0}
                    </span>
                  </div>
                </div>

                <div className="w-full mt-6 space-y-2">
                  {(() => {
                    const today = new Date().toDateString();
                    const todaySubjects = subjectQuestionCounts[today] || {};
                    return Object.entries(todaySubjects).map(([name, count], index) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(name, index) }} />
                          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white">{count} Qs</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bar Graphs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-[32px] glass border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Study Hours (Last 7 Days)</span>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                      formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.hours >= targetHours ? '#10b981' : 'rgba(16,185,129,0.3)'} 
                        />
                      ))}
                    </Bar>
                    <ReferenceLine y={targetHours} stroke="#10b981" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-[32px] glass border border-white/10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Questions Solved (Last 7 Days)</span>
                </div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900 }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#f43f5e', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Bar dataKey="questions" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.questions >= questionTarget ? '#f43f5e' : 'rgba(244,63,94,0.3)'} 
                        />
                      ))}
                    </Bar>
                    <ReferenceLine y={questionTarget} stroke="#f43f5e" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Calendar Grid */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl mb-8">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-black text-white uppercase tracking-widest">
                  {monthName} {year}
                </div>
                <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1.5">
                {days}
              </div>
            </div>
          </div>

          {/* Stats & Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="md:col-span-1 space-y-4">
              <div className="p-5 rounded-2xl glass group hover:bg-white/10 transition-all">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Study Hours</div>
                <div className="text-3xl font-mono font-bold text-emerald-400">{monthStudyHours}h</div>
                <div className="mt-2 text-[9px] text-white/20 uppercase font-bold tracking-wider">This Month</div>
              </div>
              <div className="p-5 rounded-2xl glass group hover:bg-white/10 transition-all">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Questions</div>
                <div className="text-3xl font-mono font-bold text-blue-400">{monthQuestionCount}</div>
                <div className="mt-2 text-[9px] text-white/20 uppercase font-bold tracking-wider">This Month</div>
              </div>
            </div>

            <div className="md:col-span-2 p-6 rounded-3xl glass">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Performance Analytics</h3>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 300]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#a855f7', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="marks" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMarks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mock Test Section */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-white/10" />
              <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.4em]">Mock Test Schedule</h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mb-8 p-8 rounded-[32px] bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="p-5 rounded-[24px] bg-purple-500/20 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative z-10">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div className="relative z-10 text-center md:text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Test Scheduling</h3>
                <p className="text-sm text-white/60 font-medium leading-relaxed max-w-lg">
                  Plan your success visually. Simply <span className="text-purple-400 font-black">click any date</span> in the calendar above to instantly toggle a mock test session.
                </p>
              </div>
              <div className="md:ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest relative z-10">
                <Zap className="w-3 h-3 text-purple-400" />
                Quick Action Enabled
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockTestDates.length === 0 ? (
                <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No mock tests scheduled</p>
                </div>
              ) : (
                mockTestDates
                  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                  .map((dateStr, idx) => {
                    const d = new Date(dateStr);
                    const details = mockTestDetails[dateStr] || { completed: false, marks: '' };
                    return (
                      <motion.div 
                        key={idx}
                        whileHover={{ scale: 1.01 }}
                        className="p-5 rounded-3xl glass flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => updateMockTestDetail(dateStr, !details.completed, details.marks)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                              ${details.completed ? 'bg-purple-500 border-purple-500 text-white' : 'border-white/10 hover:border-white/30'}`}
                          >
                            {details.completed && <Zap className="w-3 h-3 fill-white" />}
                          </button>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                              {d.toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mock Test</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            placeholder="Marks"
                            value={details.marks || ''}
                            onChange={(e) => updateMockTestDetail(dateStr, details.completed, e.target.value)}
                            className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <button 
                            onClick={() => deleteMockTest(dateStr)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 text-white/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerPage;
