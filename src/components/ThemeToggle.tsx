"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-[68px] rounded-full bg-slate-100 dark:bg-slate-800" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative flex items-center h-8 w-[68px] rounded-full bg-slate-100 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#252b3b] p-0.5 cursor-pointer">
      {/* Sliding indicator */}
      <motion.div
        className="absolute h-7 w-[32px] rounded-full bg-white dark:bg-[#252b3b] shadow-sm"
        animate={{ x: isDark ? 32 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />

      {/* Sun button */}
      <button
        type="button"
        onClick={() => setTheme("light")}
        className="relative z-10 flex items-center justify-center h-7 w-[32px] rounded-full cursor-pointer"
        aria-label="Light mode"
      >
        <Sun
          className={`w-[15px] h-[15px] transition-colors duration-200 ${
            isDark ? "text-slate-500" : "text-amber-500"
          }`}
        />
      </button>

      {/* Moon button */}
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className="relative z-10 flex items-center justify-center h-7 w-[32px] rounded-full cursor-pointer"
        aria-label="Dark mode"
      >
        <Moon
          className={`w-[15px] h-[15px] transition-colors duration-200 ${
            isDark ? "text-blue-400" : "text-slate-400"
          }`}
        />
      </button>
    </div>
  );
}

export default ThemeToggle;
