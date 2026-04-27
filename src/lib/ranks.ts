
export interface RankInfo {
  level: number;
  title: string;
  color: string;
  bg: string;
  icon: string;
  nextThreshold: number;
}

export const getRankInfo = (questions: number): RankInfo => {
  let level = 1;
  let threshold = 0;

  if (questions < 300) {
    level = 1;
    threshold = 300;
  } else if (questions < 500) {
    level = 2;
    threshold = 500;
  } else if (questions < 1000) {
    level = 3;
    threshold = 1000;
  } else {
    // Level 4 starts at 1000
    // Level n = 1000 + (n-4) * 300
    level = Math.floor((questions - 1000) / 300) + 4;
    threshold = 1000 + (level - 3) * 300;
  }

  // Cap level at 51 (15000+ questions)
  if (level > 51) level = 51;
  if (questions >= 15000) level = 51;

  const getTitle = (lvl: number) => {
    if (lvl <= 3) return "Newbie";
    if (lvl <= 6) return "Sergeant";
    if (lvl <= 9) return "Lieutenant";
    if (lvl <= 12) return "Captain";
    if (lvl <= 15) return "Major";
    if (lvl <= 18) return "Colonel";
    if (lvl <= 21) return "Brigadier";
    if (lvl <= 24) return "General";
    if (lvl <= 27) return "Field Marshal";
    if (lvl <= 30) return "Commander";
    if (lvl <= 33) return "Vice Admiral";
    if (lvl <= 36) return "Admiral";
    if (lvl <= 39) return "Fleet Admiral";
    if (lvl <= 42) return "High Commander";
    if (lvl <= 45) return "Supreme Commander";
    if (lvl <= 48) return "Grand Master";
    if (lvl <= 50) return "Legend";
    return "Immortal";
  };

  const getColor = (lvl: number) => {
    if (lvl <= 3) return "text-zinc-400";
    if (lvl <= 6) return "text-emerald-400";
    if (lvl <= 9) return "text-blue-400";
    if (lvl <= 12) return "text-cyan-400";
    if (lvl <= 15) return "text-fuchsia-400";
    if (lvl <= 18) return "text-pink-400";
    if (lvl <= 21) return "text-rose-400";
    if (lvl <= 24) return "text-orange-400";
    if (lvl <= 27) return "text-amber-400";
    if (lvl <= 30) return "text-yellow-400";
    if (lvl <= 33) return "text-lime-400";
    if (lvl <= 36) return "text-green-400";
    if (lvl <= 39) return "text-teal-400";
    if (lvl <= 42) return "text-sky-400";
    if (lvl <= 45) return "text-indigo-400";
    if (lvl <= 48) return "text-violet-400";
    if (lvl <= 50) return "text-purple-400";
    return "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] font-black";
  };

  const getBg = (lvl: number) => {
    if (lvl <= 3) return "bg-zinc-400/20";
    if (lvl <= 6) return "bg-emerald-400/20";
    if (lvl <= 9) return "bg-blue-400/20";
    if (lvl <= 12) return "bg-cyan-400/20";
    if (lvl <= 15) return "bg-fuchsia-400/20";
    if (lvl <= 18) return "bg-pink-400/20";
    if (lvl <= 21) return "bg-rose-400/20";
    if (lvl <= 24) return "bg-orange-400/20";
    if (lvl <= 27) return "bg-amber-400/20";
    if (lvl <= 30) return "bg-yellow-400/20";
    if (lvl <= 33) return "bg-lime-400/20";
    if (lvl <= 36) return "bg-green-400/20";
    if (lvl <= 39) return "bg-teal-400/20";
    if (lvl <= 42) return "bg-sky-400/20";
    if (lvl <= 45) return "bg-indigo-400/20";
    if (lvl <= 48) return "bg-violet-400/20";
    if (lvl <= 50) return "bg-purple-400/20";
    return "bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]";
  };

  const getIcon = (lvl: number) => {
    if (lvl <= 3) return "🔰";
    if (lvl <= 6) return "🎖️";
    if (lvl <= 9) return "⚔️";
    if (lvl <= 12) return "🛡️";
    if (lvl <= 15) return "🦅";
    if (lvl <= 18) return "⭐";
    if (lvl <= 21) return "⭐⭐";
    if (lvl <= 24) return "⭐⭐⭐";
    if (lvl <= 27) return "👑";
    if (lvl <= 30) return "🔱";
    if (lvl <= 33) return "⚓";
    if (lvl <= 36) return "🚢";
    if (lvl <= 39) return "🌌";
    if (lvl <= 42) return "🪐";
    if (lvl <= 45) return "💠";
    if (lvl <= 48) return "🌀";
    if (lvl <= 50) return "🔥";
    return "💎";
  };

  return {
    level,
    title: getTitle(level),
    color: getColor(level),
    bg: getBg(level),
    icon: getIcon(level),
    nextThreshold: threshold
  };
};
