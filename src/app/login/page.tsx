import { login } from '@/app/actions'
import { ThemeToggle } from '@/components/ThemeToggle';
import { User, Lock } from 'lucide-react';
import Image from 'next/image';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Theme Toggle at Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 glass border border-border/50 rounded-[2rem] shadow-2xl relative z-10 mx-4">
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 bg-card rounded-2xl flex items-center justify-center overflow-hidden border border-border p-3 shadow-inner transform hover:scale-105 transition-transform duration-300">
             <Image src="/logo.png" alt="Sim Oil Shop" width={96} height={96} className="h-full w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Sim Oil Shop</h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">ระบบจัดการสต๊อกสินค้า</p>
        </div>

        {resolvedParams?.error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
            ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
          </div>
        )}

        <form action={login} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">ชื่อผู้ใช้งาน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="username"
                placeholder="admin"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-background/50 border border-border rounded-xl py-3 pl-12 pr-4 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">รหัสผ่าน</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-background/50 border border-border rounded-xl py-3 pl-12 pr-4 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 mt-8 text-lg"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  )
}
