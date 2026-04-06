import React, { useState, useEffect } from 'react';
import { DemoOne } from "@/components/DemoOne";
import CalendarPage from "@/components/CalendarPage";
import CompetePage from "@/components/CompetePage";
import CommunityPage from "@/components/CommunityPage";
import Navbar from "@/components/Navbar";
import AuthPage from "@/components/AuthPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { auth, onAuthStateChanged, User } from '@/src/firebase';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'compete' | 'community'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) setShowAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-black selection:bg-purple-500/30 selection:text-purple-200">
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
              <DemoOne />
            ) : activeTab === 'calendar' ? (
              <CalendarPage />
            ) : activeTab === 'compete' ? (
              <CompetePage onAuthRequest={() => setShowAuth(true)} />
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

      {!showAuth && <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />}
      </main>
    </ErrorBoundary>
  );
}
