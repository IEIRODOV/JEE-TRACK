
export interface RankInfo {
  tier: string;
  subTier: string;
  title: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: string;
  threshold: number;
  nextThreshold: number;
}

export const getRankInfo = (questions: number): RankInfo => {
  const ranks = [
    { threshold: 0, title: "Unranked", color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", glow: "shadow-none", icon: "⭕" },
    
    // Bronze (Tier 1-3)
    { threshold: 50, title: "Bronze III", color: "text-orange-700", bg: "bg-orange-700/10", border: "border-orange-700/20", glow: "shadow-none", icon: "🥉" },
    { threshold: 150, title: "Bronze II", color: "text-orange-600", bg: "bg-orange-600/10", border: "border-orange-600/20", glow: "shadow-none", icon: "🥉" },
    { threshold: 300, title: "Bronze I", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", glow: "shadow-none", icon: "🥉" },

    // Silver (Tier 4-6)
    { threshold: 500, title: "Silver III", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", glow: "shadow-none", icon: "🥈" },
    { threshold: 800, title: "Silver II", color: "text-slate-300", bg: "bg-slate-300/10", border: "border-slate-300/20", glow: "shadow-none", icon: "🥈" },
    { threshold: 1200, title: "Silver I", color: "text-slate-200", bg: "bg-slate-200/10", border: "border-slate-200/20", glow: "shadow-none", icon: "🥈" },

    // Gold (Tier 7-9)
    { threshold: 1700, title: "Gold III", color: "text-yellow-600", bg: "bg-yellow-600/10", border: "border-yellow-600/20", glow: "shadow-none", icon: "🥇" },
    { threshold: 2400, title: "Gold II", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", glow: "shadow-none", icon: "🥇" },
    { threshold: 3200, title: "Gold I", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", glow: "shadow-[0_0_10px_rgba(250,204,21,0.2)]", icon: "🥇" },

    // Platinum (Tier 10-12)
    { threshold: 4200, title: "Platinum III", color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", glow: "shadow-none", icon: "💠" },
    { threshold: 5500, title: "Platinum II", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20", glow: "shadow-none", icon: "💠" },
    { threshold: 7000, title: "Platinum I", color: "text-cyan-300", bg: "bg-cyan-300/10", border: "border-cyan-300/20", glow: "shadow-[0_0_12px_rgba(34,211,238,0.2)]", icon: "💠" },

    // Emerald (Tier 13-15)
    { threshold: 9000, title: "Emerald III", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-none", icon: "✳️" },
    { threshold: 11000, title: "Emerald II", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", glow: "shadow-none", icon: "✳️" },
    { threshold: 13500, title: "Emerald I", color: "text-emerald-300", bg: "bg-emerald-300/10", border: "border-emerald-300/20", glow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]", icon: "✳️" },

    // Diamond (Tier 16-18)
    { threshold: 16000, title: "Diamond III", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", glow: "shadow-none", icon: "💎" },
    { threshold: 18500, title: "Diamond II", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", glow: "shadow-none", icon: "💎" },
    { threshold: 21000, title: "Diamond I", color: "text-blue-300", bg: "bg-blue-300/10", border: "border-blue-300/20", glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]", icon: "💎" },

    // Master (Tier 19-21)
    { threshold: 22500, title: "Master III", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "shadow-none", icon: "🔮" },
    { threshold: 23500, title: "Master II", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", glow: "shadow-none", icon: "🔮" },
    { threshold: 24200, title: "Master I", color: "text-purple-300", bg: "bg-purple-300/10", border: "border-purple-300/20", glow: "shadow-[0_0_25px_rgba(168,85,247,0.5)]", icon: "🔮" },

    // Grandmaster
    { threshold: 24600, title: "Grandmaster", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-[0_0_30px_rgba(244,63,94,0.6)]", icon: "👑" },
    
    // Challenger
    { threshold: 24850, title: "Challenger", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", glow: "shadow-[0_0_40px_rgba(251,191,36,0.7)]", icon: "🔥" },
    
    // Legend
    { threshold: 25000, title: "Legend", color: "text-white font-black italic", bg: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500", border: "border-white/50", glow: "shadow-[0_0_50px_rgba(255,255,255,0.8)]", icon: "🌌" }

  ];

  let currentRank = ranks[0];
  let nextRank = ranks[1];

  for (let i = 0; i < ranks.length; i++) {
    if (questions >= ranks[i].threshold) {
      currentRank = ranks[i];
      nextRank = ranks[i + 1] || ranks[i];
    } else {
      break;
    }
  }

  const parts = currentRank.title.split(' ');
  const tier = parts[0];
  const subTier = parts[1] || "";

  return {
    tier,
    subTier,
    title: currentRank.title,
    color: currentRank.color,
    bg: currentRank.bg,
    border: currentRank.border,
    glow: currentRank.glow,
    icon: currentRank.icon,
    threshold: currentRank.threshold,
    nextThreshold: nextRank.threshold
  };
};

