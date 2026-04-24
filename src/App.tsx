import React, { useState, useEffect } from 'react';
import { DemoOne } from "@/components/DemoOne";
import TimerPage from "@/components/TimerPage";
import ProgressPage from "@/components/ProgressPage";
import CompetePage from "@/components/CompetePage";
import CommunityPage from "@/components/CommunityPage";
import Navbar from "@/components/Navbar";
import AuthPage from "@/components/AuthPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { auth, onAuthStateChanged, User, db, setDoc, doc, getDoc } from '@/src/firebase';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';

import ProfilePage from "@/components/ProfilePage";
import PulseLoader from "@/components/ui/pulse-loader";
import LegalModal from "@/components/LegalModal";

import { playTickSound } from '@/src/lib/sounds';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'progress' | 'timer' | 'compete' | 'community' | 'profile'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean, type: 'terms' | 'privacy' | 'refund' | 'cancellation' }>({
    isOpen: false,
    type: 'terms'
  });
  const [settings, setSettings] = useState({ 
    activateChat: true, 
    activateCommunity: true, 
    streakGoal: 4,
    timerSoundEnabled: true,
    timerSoundType: 'f1'
  });

  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
      } catch (error) {
        console.error("Error updating settings:", error);
      }
    }
    
    // Update local storage for immediate effect if needed
    if (newSettings.activateChat !== undefined) localStorage.setItem('pulse_activate_chat', String(newSettings.activateChat));
    if (newSettings.activateCommunity !== undefined) localStorage.setItem('pulse_activate_community', String(newSettings.activateCommunity));
    if (newSettings.streakGoal !== undefined) localStorage.setItem('pulse_streak_goal', String(newSettings.streakGoal));
    if (newSettings.timerSoundEnabled !== undefined) localStorage.setItem('pulse_timer_sound_enabled', String(newSettings.timerSoundEnabled));
    if (newSettings.timerSoundType !== undefined) localStorage.setItem('pulse_timer_sound_type', String(newSettings.timerSoundType));
  };

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
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSettings({
              activateChat: data.activateChat !== undefined ? data.activateChat : (data.deactivateChat !== undefined ? !data.deactivateChat : true),
              activateCommunity: data.activateCommunity !== undefined ? data.activateCommunity : (data.deactivateCommunity !== undefined ? !data.deactivateCommunity : true),
              streakGoal: data.streakGoal || 4,
              timerSoundEnabled: data.timerSoundEnabled !== undefined ? data.timerSoundEnabled : true,
              timerSoundType: data.timerSoundType || 'f1'
            });
            
            // Ensure profile data, friendCode and friends array exist
            const updates: any = {};
            if ((!data.displayName || data.displayName === 'Anonymous' || data.displayName === 'Friend') && currentUser.displayName) {
              updates.displayName = currentUser.displayName;
            }
            if (!data.email && currentUser.email) updates.email = currentUser.email;
            if (!data.photoURL && currentUser.photoURL) updates.photoURL = currentUser.photoURL;
            
            if (!data.friendCode) {
              updates.friendCode = currentUser.uid.substring(0, 6).toUpperCase();
            }
            if (!data.friends) {
              updates.friends = [];
            }
            
            if (Object.keys(updates).length > 0) {
              await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
            }

            if (!data.onboarded) {
              console.log("App.tsx: User needs onboarding");
              needsOnboarding = true;
            }
          } else {
            needsOnboarding = true;
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

  useEffect(() => {
    // Check URL parameters for legal pages (for Razorpay compliance bot)
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    if (page && ['terms', 'privacy', 'refund', 'cancellation'].includes(page)) {
      setLegalModal({ isOpen: true, type: page as any });
    }

    const handleLegal = (e: any) => {
      setLegalModal({ isOpen: true, type: e.detail });
    };
    window.addEventListener('show-legal', handleLegal);
    return () => window.removeEventListener('show-legal', handleLegal);
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
              <DemoOne onProfileClick={() => handleTabChange('profile')} settings={settings} updateSettings={updateSettings} />
            ) : activeTab === 'progress' ? (
              <ProgressPage />
            ) : activeTab === 'timer' ? (
              <TimerPage settings={settings} />
            ) : activeTab === 'compete' ? (
              <CompetePage onAuthRequest={() => setShowAuth(true)} activateChat={settings.activateChat} />
            ) : activeTab === 'profile' ? (
              <ProfilePage onBack={() => handleTabChange('dashboard')} />
            ) : (
              <CommunityPage onAuthRequest={() => setShowAuth(true)} activateCommunity={settings.activateCommunity} />
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
      <LegalModal 
        isOpen={legalModal.isOpen} 
        onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))} 
        type={legalModal.type} 
      />

      {!showAuth && <Navbar activeTab={activeTab} setActiveTab={handleTabChange} activateCommunity={settings.activateCommunity} />}
      <Toaster position="top-right" expand={false} richColors theme="dark" />
      </main>
    </ErrorBoundary>
  );
}
