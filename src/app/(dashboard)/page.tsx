import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export default async function Home() {
  // 1. Total products
  const totalProducts = await prisma.product.count();

  // 2. Today's stats (Inbound & Outbound)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todaysTransactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: startOfToday }
    },
    include: { items: true }
  });

  let inboundToday = 0;
  let outboundToday = 0;

  todaysTransactions.forEach(t => {
    const qty = t.items.reduce((sum, item) => sum + item.quantity, 0);
    if (t.type === 'INBOUND') inboundToday += qty;
    if (t.type === 'OUTBOUND') outboundToday += qty;
    // Note: DEFECT is treated separately, or we could count it as outbound
  });

  // 3. Low Stock Items (Inventory < 5)
  // Group by productId and sum quantity across locations (though we only have MAIN_WH mostly)
  const inventoryStatus = await prisma.inventory.findMany({
    where: { quantity: { lt: 5 } },
    include: { product: true }
  });
  const lowStockCount = inventoryStatus.length;

  // 4. Recent Transactions
  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { 
      items: { include: { product: true } } 
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Dashboard</h1>
        <p className="text-slate-400 mt-1">ภาพรวมคลังสินค้าและการเคลื่อนไหววันนี้</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#18181b] border border-slate-800 text-slate-200 rounded-2xl shadow-sm p-6">
          <div className="text-slate-400 text-sm font-medium">สินค้ารวมทั้งหมด</div>
          <div className="text-3xl font-bold mt-2">{totalProducts.toLocaleString()} <span className="text-sm font-normal text-slate-500">รายการ</span></div>
        </div>
        <div className="bg-[#18181b] border border-slate-800 text-slate-200 rounded-2xl shadow-sm p-6">
          <div className="text-slate-400 text-sm font-medium">รับเข้าวันนี้</div>
          <div className="text-3xl font-bold mt-2 text-blue-500">+{inboundToday.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span></div>
        </div>
        <div className="bg-[#18181b] border border-slate-800 text-slate-200 rounded-2xl shadow-sm p-6">
          <div className="text-slate-400 text-sm font-medium">เบิกออก/ขายวันนี้</div>
          <div className="text-3xl font-bold mt-2 text-green-500">-{outboundToday.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span></div>
        </div>
        <div className="bg-[#18181b] border border-red-900/30 text-slate-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
          <div className="text-red-400 text-sm font-medium relative z-10">ใกล้หมดสต๊อก (Low Stock)</div>
          <div className="text-3xl font-bold mt-2 text-red-500 relative z-10">{lowStockCount} <span className="text-sm font-normal text-red-400/70">รายการ</span></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock List */}
        <div className="bg-[#18181b] border border-slate-800 rounded-2xl shadow-sm p-6 min-h-[400px]">
          <h2 className="font-bold text-lg mb-4 text-slate-200 flex items-center gap-2">
            <span className="text-red-500">⚠️</span> สินค้าที่ต้องสั่งเพิ่ม
          </h2>
          {inventoryStatus.length === 0 ? (
            <div className="text-slate-500 text-center py-10">ไม่มีสินค้าคงคลังต่ำ</div>
          ) : (
            <div className="space-y-3">
              {inventoryStatus.slice(0, 8).map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-3 bg-[#09090b] rounded-xl border border-slate-800/50">
                  <div className="truncate pr-4">
                    <div className="font-medium text-slate-300 text-sm truncate">{inv.product.name}</div>
                  </div>
                  <div className={`font-bold px-2 py-1 rounded text-sm whitespace-nowrap ${inv.quantity <= 0 ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    {inv.quantity} ชิ้น
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#18181b] border border-slate-800 rounded-2xl shadow-sm p-6 lg:col-span-2 min-h-[400px]">
          <h2 className="font-bold text-lg mb-4 text-slate-200">รายการเคลื่อนไหวล่าสุด</h2>
          {recentTransactions.length === 0 ? (
            <div className="text-slate-500 text-center py-10">ยังไม่มีการเคลื่อนไหวของสต๊อก</div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-start p-4 bg-[#09090b] rounded-xl border border-slate-800/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                        tx.type === 'INBOUND' ? 'bg-blue-500/20 text-blue-400' :
                        tx.type === 'OUTBOUND' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="text-xs text-slate-500">{format(tx.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{tx.reference}</span>
                    </div>
                    <div className="text-sm text-slate-300 mt-2">
                      {tx.items.slice(0, 2).map(item => (
                        <div key={item.id}>• {item.product.name}</div>
                      ))}
                      {tx.items.length > 2 && <div className="text-slate-500 text-xs mt-1">และอื่นๆ อีก {tx.items.length - 2} รายการ...</div>}
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${
                    tx.type === 'INBOUND' ? 'text-blue-500' :
                    tx.type === 'OUTBOUND' ? 'text-green-500' :
                    'text-red-500'
                  }`}>
                    {tx.type === 'INBOUND' ? '+' : '-'}{tx.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
