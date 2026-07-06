import { login } from '@/app/actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-slate-200 p-4">
      <div className="w-full max-w-md p-8 bg-[#18181b] border border-slate-800 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border border-slate-800 p-2">
             <img src="/logo.png" alt="Sim Oil Shop" className="h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-orange-500">Sim Oil Shop</h1>
          <p className="text-sm text-slate-400 mt-1">ระบบจัดการสต๊อกสินค้า</p>
        </div>

        {resolvedParams?.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
            ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">ชื่อผู้ใช้งาน (Username)</label>
            <input 
              type="text"
              name="username" 
              placeholder="admin"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">รหัสผ่าน (Password)</label>
            <input 
              type="password"
              name="password" 
              placeholder="••••••••"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/20 mt-4"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  )
}
