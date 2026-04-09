import React, { useState, useEffect } from 'react';
import { DemoOne } from "@/components/DemoOne";
import CalendarPage from "@/components/CalendarPage";
import ProgressPage from "@/components/ProgressPage";
import CompetePage from "@/components/CompetePage";
import CommunityPage from "@/components/CommunityPage";
import Navbar from "@/components/Navbar";
import AuthPage from "@/components/AuthPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { auth, onAuthStateChanged, User, db } from '@/src/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';

import ProfilePage from "@/components/ProfilePage";
import PulseLoader from "@/components/ui/pulse-loader";

import { playTickSound } from '@/src/lib/sounds';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'progress' | 'calendar' | 'compete' | 'community' | 'profile'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Global safety timeout to ensure loading screen eventually disappears
    const safetyTimeout = setTimeout(() => {
      console.warn("App.tsx: Safety timeout triggered. Loading screen forced to close.");
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("App.tsx: Auth state changed", currentUser?.uid);
      setUser(currentUser);
      
      let needsOnboarding = false;
      if (currentUser) {
        try {
          // Add a timeout to the getDoc call to prevent infinite loading if Firestore is slow
          const userDocPromise = getDoc(doc(db, 'users', currentUser.uid));
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );
          
          const userDoc = await Promise.race([userDocPromise, timeoutPromise]) as any;
          
          if (!userDoc.exists() || !userDoc.data()?.onboarded) {
            console.log("App.tsx: User needs onboarding");
            needsOnboarding = true;
          } else {
            console.log("App.tsx: User already onboarded");
          }
        } catch (error) {
          console.error("Error fetching user data in App.tsx:", error);
          // Fallback to localStorage if Firestore fails
          const localOnboarded = localStorage.getItem('pulse_user_exam');
          if (!localOnboarded) {
            needsOnboarding = true;
          }
        }
      }

      setLoading(false);
      clearTimeout(safetyTimeout);

      if (currentUser && !needsOnboarding) {
        setShowAuth(false);
      } else {
        setShowAuth(true);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  if (loading) {
    return <PulseLoader fullScreen />;
  }

  const handleTabChange = (tab: typeof activeTab) => {
    playTickSound();
    setActiveTab(tab);
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-black selection:bg-purple-500/30 selection:text-purple-200 select-none">
      <AnimatePresence mode="wait">
        {!showAuth ? (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ 
              duration: 0.3, 
              ease: "easeOut"
            }}
            className="w-full"
          >
            {activeTab === 'dashboard' ? (
              <DemoOne onProfileClick={() => handleTabChange('profile')} />
            ) : activeTab === 'progress' ? (
              <ProgressPage />
            ) : activeTab === 'calendar' ? (
              <CalendarPage />
            ) : activeTab === 'compete' ? (
              <CompetePage onAuthRequest={() => setShowAuth(true)} />
            ) : activeTab === 'profile' ? (
              <ProfilePage onBack={() => handleTabChange('dashboard')} />
            ) : (
              <CommunityPage onAuthRequest={() => setShowAuth(true)} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            <AuthPage onBack={() => setShowAuth(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!showAuth && <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />}
      </main>
    </ErrorBoundary>
  );
}
