import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth, db, signOut } from '@/src/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Target, BookOpen, Activity, Loader2, LogOut, Save, User as UserIcon, ChevronLeft, Sparkles } from 'lucide-react';
import { playTickSound } from '@/src/lib/sounds';
import AnoAI from "@/components/ui/animated-shader-background";

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubExam, setSelectedSubExam] = useState('mains');
  const [customExamName, setCustomExamName] = useState('');
  const [customExamDate, setCustomExamDate] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const isCustom = !['jee', 'neet', 'boards'].includes(data.exam?.toLowerCase());
          setSelectedExam(isCustom ? 'more' : (data.exam || 'jee'));
          setSelectedYear(data.year || '2027');
          setSelectedSubExam(data.subExam || 'mains');
          if (isCustom) {
            setCustomExamName(data.exam);
            setCustomExamDate(data.customDate || '');
          }
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    playTickSound();
    setSaving(true);
    setError('');
    setSuccess('');
    
    if (selectedExam === 'more' && (!customExamName || !customExamDate)) {
      setError("Please provide custom exam name and date");
      setSaving(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const examName = selectedExam === 'more' ? customExamName : selectedExam;
        // Update Firestore
        await setDoc(doc(db, 'users', currentUser.uid), {
          displayName: displayName,
          exam: examName,
          year: selectedYear,
          subExam: selectedExam === 'jee' ? selectedSubExam : null,
          customDate: selectedExam === 'more' ? customExamDate : null,
          updatedAt: new Date()
        }, { merge: true });

        // Update Leaderboard display name
        await setDoc(doc(db, 'leaderboard', currentUser.uid), {
          displayName: displayName
        }, { merge: true });

        localStorage.setItem('pulse_user_exam', examName);
        localStorage.setItem('pulse_user_year', selectedYear);
        localStorage.setItem('pulse_user_subexam', selectedSubExam);
        if (selectedExam === 'more') localStorage.setItem('pulse_custom_date', customExamDate);

        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    playTickSound();
    await signOut(auth);
    window.location.reload();
  };

  const EXAMS = [
    { id: 'jee', label: 'JEE', icon: <Target className="w-4 h-4" /> },
    { id: 'neet', label: 'NEET', icon: <Activity className="w-4 h-4" /> },
    { id: 'boards', label: 'Boards', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'more', label: 'More', icon: <Sparkles className="w-4 h-4" /> },
  ];

  const YEARS = ['2026', '2027', '2028'];
  const CLASSES = ['9th', '10th', '11th', '12th'];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AnoAI />
      
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-32">
        <button 
          onClick={() => { playTickSound(); onBack(); }}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Return to Mission</span>
        </button>

        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-white/20" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Commander Profile</h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">ID: {user?.uid?.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="space-y-10">
          {/* Username */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>

          {/* Exam Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Primary Objective</label>
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
              className="space-y-4"
            >
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">JEE Category</label>
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
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Exam Name</label>
                <input 
                  type="text"
                  value={customExamName}
                  onChange={(e) => setCustomExamName(e.target.value)}
                  placeholder="e.g. UPSC, GATE, SAT"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Exam Date</label>
                <input 
                  type="date"
                  value={customExamDate}
                  onChange={(e) => setCustomExamDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white [color-scheme:dark]"
                />
              </div>
            </motion.div>
          )}

          {/* Year Selection */}
          {selectedExam && selectedExam !== 'more' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">
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

          <div className="pt-6 space-y-4">
            {error && (
              <p className="text-red-400 text-xs font-bold text-center">{error}</p>
            )}
            {success && (
              <p className="text-emerald-400 text-xs font-bold text-center">{success}</p>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Mission Parameters
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
