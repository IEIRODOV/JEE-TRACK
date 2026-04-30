import React, { useState } from 'react';
import { motion } from 'motion/react';
import { auth, GoogleAuthProvider, signInWithPopup, db, serverTimestamp } from '@/src/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Sparkles, Zap, CheckCircle2, Activity, Target, BookOpen, Loader2, Award } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';

interface AuthPageProps {
  onBack?: () => void;
}

const AuthPage = ({ onBack }: AuthPageProps) => {
  const [step, setStep] = useState<'auth' | 'exam-selection'>('auth');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubExam, setSelectedSubExam] = useState('mains'); // For JEE: mains or advanced
  const [customExamName, setCustomExamName] = useState('');
  const [customExamDate, setCustomExamDate] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      playTickSound();

      if (result.user) {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists() && userDoc.data().exam) {
          // App.tsx will handle redirection
          console.log("AuthPage: User exists, waiting for App.tsx");
        } else {
          setStep('exam-selection');
        }
      }
    } catch (err: any) {
      console.error("Google Auth error:", err.code, err.message);
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked by browser. Please allow popups for this site and try again.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExamSubmit = async () => {
    if (!selectedExam) {
      setError("Please select an exam");
      return;
    }

    if (selectedExam === 'more' && (!customExamName || !customExamDate)) {
      setError("Please provide custom exam name and date");
      return;
    }

    if (selectedExam !== 'more' && !selectedYear) {
      setError("Please select a target year/class");
      return;
    }

    playTickSound();
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const examData = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          exam: selectedExam === 'more' ? customExamName : selectedExam,
          year: selectedYear,
          subExam: selectedExam === 'jee' ? selectedSubExam : null,
          customDate: selectedExam === 'more' ? customExamDate : null,
          onboarded: true,
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'users', user.uid), examData, { merge: true });
        
        localStorage.setItem('pulse_user_exam', examData.exam);
        localStorage.setItem('pulse_user_year', selectedYear);
        localStorage.setItem('pulse_user_subexam', selectedSubExam);
        if (customExamDate) localStorage.setItem('pulse_custom_date', customExamDate);
        
        console.log("AuthPage: Onboarding complete, reloading...");
        // Small delay to ensure localStorage is written and Firestore is synced
        setTimeout(() => {
          window.location.reload();
        }, 500);

        // Safety fallback if reload doesn't happen
        setTimeout(() => {
          setLoading(false);
          window.location.href = '/';
        }, 5000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const EXAMS = [
    { id: 'jee', label: 'JEE', icon: <Target className="w-5 h-5" /> },
    { id: 'neet', label: 'NEET', icon: <Activity className="w-5 h-5" /> },
    { id: 'boards', label: 'Boards', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'ca', label: 'CA', icon: <Award className="w-5 h-5" /> },
    { id: 'more', label: 'More', icon: <Sparkles className="w-5 h-5" /> },
  ];

  const YEARS = ['2026', '2027', '2028'];
  const CLASSES = ['9th', '10th', '11th', '12th'];

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row relative z-[100] overflow-y-auto">
      {/* Left Side: Branding & Inspiration */}
      <div className="w-full md:w-1/2 md:h-screen md:sticky md:top-0 overflow-hidden bg-zinc-950 border-r border-white/5 flex flex-col justify-center p-8 md:p-24 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)]" />
        
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">System Online</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-6">
              JEE<br /><span className="text-purple-500">PULSE</span>
            </h1>
            <p className="text-white/40 text-sm md:text-base font-medium max-w-md leading-relaxed">
              Precision tracking for high-stakes examinations. Monitor your progress, master your subjects, and dominate the competition.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              { icon: <Zap className="w-4 h-4" />, text: "Real-time performance analytics" },
              { icon: <Target className="w-4 h-4" />, text: "Exam-specific countdown systems" },
              { icon: <CheckCircle2 className="w-4 h-4" />, text: "Syllabus mastery tracking" }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 text-white/60"
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400">
                  {feature.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* Right Side: Auth/Onboarding */}
      <div className="w-full md:w-1/2 min-h-screen bg-black flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md">
          {step === 'auth' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">Initialize Tracking</h2>
              <p className="text-white/40 text-sm mb-12 font-medium uppercase tracking-widest">Connect your secure identity</p>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full group relative flex items-center justify-center gap-4 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full"
            >
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">Select Objective</h2>
              <p className="text-white/40 text-sm mb-12 font-medium uppercase tracking-widest">Configure your mission parameters</p>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block">Primary Examination</label>
                  <div className="grid grid-cols-3 gap-3">
                    {EXAMS.map((exam) => (
                      <button
                        key={exam.id}
                        onClick={() => { playTickSound(); setSelectedExam(exam.id); }}
                        className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                          selectedExam === exam.id 
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {exam.icon}
                        <span className="text-[10px] font-black uppercase tracking-widest">{exam.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedExam === 'jee' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block">JEE Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['mains', 'advanced'].map((sub) => (
                        <button
                          key={sub}
                          onClick={() => { playTickSound(); setSelectedSubExam(sub); }}
                          className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedSubExam === sub
                              ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedExam === 'more' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block">Exam Name</label>
                      <input 
                        type="text"
                        value={customExamName}
                        onChange={(e) => setCustomExamName(e.target.value)}
                        placeholder="e.g. UPSC, GATE, SAT"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block">Exam Date</label>
                      <input 
                        type="date"
                        value={customExamDate}
                        onChange={(e) => setCustomExamDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white [color-scheme:dark]"
                      />
                    </div>
                  </motion.div>
                )}

                {selectedExam && selectedExam !== 'more' && (
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 block">
                      {selectedExam === 'boards' ? 'Target Class' : 'Target Year'}
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {(selectedExam === 'boards' ? CLASSES : YEARS).map((item) => (
                        <button
                          key={item}
                          onClick={() => { playTickSound(); setSelectedYear(item); }}
                          className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedYear === item 
                              ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExamSubmit}
                  disabled={loading || !selectedExam || (selectedExam !== 'more' && !selectedYear) || (selectedExam === 'more' && (!customExamName || !customExamDate))}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-500 transition-all active:scale-[0.98] disabled:opacity-50 mt-8 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Initiate Mission"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
