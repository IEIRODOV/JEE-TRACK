import React, { useState } from 'react';
import { DemoOne } from "@/components/DemoOne";
import CalendarPage from "@/components/CalendarPage";
import CompetePage from "@/components/CompetePage";
import ResourcePage from "@/components/ResourcePage";
import Navbar from "@/components/Navbar";
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'compete' | 'resource'>('dashboard');

  return (
    <main className="min-h-screen bg-black selection:bg-purple-500/30 selection:text-purple-200">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
          transition={{ 
            duration: 0.4, 
            ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for smooth feel
          }}
          className="w-full"
        >
          {activeTab === 'dashboard' ? (
            <DemoOne />
          ) : activeTab === 'calendar' ? (
            <CalendarPage />
          ) : activeTab === 'compete' ? (
            <CompetePage />
          ) : (
            <ResourcePage />
          )}
        </motion.div>
      </AnimatePresence>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}
