import React from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, Trophy, MessageSquare, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, signOut } from '@/src/firebase';

interface NavbarProps {
  activeTab: 'dashboard' | 'progress' | 'calendar' | 'compete' | 'community' | 'profile';
  setActiveTab: (tab: 'dashboard' | 'progress' | 'calendar' | 'compete' | 'community' | 'profile') => void;
}

const Navbar = ({ activeTab, setActiveTab }: NavbarProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-fit flex items-center gap-3">
      <div className="flex items-center gap-1 p-1.5 rounded-[24px] border border-white/10 backdrop-blur-3xl bg-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'progress', icon: Activity, label: 'Progress' },
          { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
          { id: 'compete', icon: Trophy, label: 'Compete' },
          { id: 'community', icon: MessageSquare, label: 'Community' }
        ].map((tab, idx) => (
          <React.Fragment key={tab.id}>
            <button
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2.5 px-5 py-3 rounded-[18px] transition-all duration-500 group
                ${activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-white/10 rounded-[18px] border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={`w-4.5 h-4.5 transition-all duration-500 ${activeTab === tab.id ? 'scale-110 text-glow' : 'group-hover:scale-110 group-hover:text-white/80'}`} />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase hidden md:block">{tab.label}</span>
              
              {/* Hover Indicator */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            </button>
            {idx < 4 && <div className="w-px h-4 bg-white/5 mx-0.5" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Navbar;
