'use client'

import { ThemeToggle } from "@/components/ThemeToggle";

export default function TopBar({ role, onMenuClick }: { role?: string, onMenuClick?: () => void }) {
  return (
    <header className="h-16 glass shadow-sm sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="font-semibold text-lg text-foreground hidden sm:block">
          ระบบศูนย์กลางจัดการธุรกิจ
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="hidden sm:inline">System Online</span>
        </div>
        <ThemeToggle />
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-inner">
          {role === 'admin' ? 'A' : 'W'}
        </div>
      </div>
    </header>
  );
}
