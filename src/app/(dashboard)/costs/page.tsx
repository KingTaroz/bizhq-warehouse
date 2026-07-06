import { prisma } from '@/lib/prisma'
import CostClient from './CostClient'

export default async function CostManagementPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8 ml-0 lg:ml-64 pt-20 lg:pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">💰 จัดการราคาทุน (Cost Management)</h1>
          <p className="text-slate-400 mt-1">อัปเดตและเช็คราคาทุนปัจจุบันของสินค้าทั้งหมด</p>
        </div>
        
        <CostClient initialProducts={products} />
      </div>
    </main>
  )
}
