'use client'

export default function TopBar({ role, onMenuClick }: { role?: string, onMenuClick?: () => void }) {
  return (
    <header className="h-16 bg-[#18181b]/80 backdrop-blur-md border-b border-slate-800 shadow-sm sticky top-0 z-10 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="font-medium text-lg text-slate-200 hidden sm:block">
          ระบบศูนย์กลางจัดการธุรกิจ
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
          <span className="hidden sm:inline">System Online</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold sm:ml-4 border border-orange-500/30">
          {role === 'admin' ? 'A' : 'W'}
        </div>
      </div>
    </header>
  );
}
