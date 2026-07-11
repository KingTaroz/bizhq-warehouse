import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

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

  todaysTransactions.forEach((t: any) => {
    const qty = t.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
    if (t.type === 'INBOUND') inboundToday += qty;
    if (t.type === 'OUTBOUND') outboundToday += qty;
  });

  // 3. Low Stock Items (Inventory < 5)
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
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">ภาพรวมคลังสินค้าและการเคลื่อนไหววันนี้</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric Cards with Glassmorphism */}
        <div className="glass rounded-[1.5rem] p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-24 h-24" />
          </div>
          <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider">สินค้ารวมทั้งหมด</div>
          <div className="text-4xl font-extrabold mt-3 text-foreground">{totalProducts.toLocaleString()} <span className="text-sm font-medium text-muted-foreground ml-1">รายการ</span></div>
        </div>

        <div className="glass rounded-[1.5rem] p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group border-b-4 border-b-blue-500/50">
          <div className="absolute top-0 right-0 p-4 text-blue-500 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownToLine className="w-24 h-24" />
          </div>
          <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider">รับเข้าวันนี้</div>
          <div className="text-4xl font-extrabold mt-3 text-blue-500 drop-shadow-sm">+{inboundToday.toLocaleString()} <span className="text-sm font-medium text-blue-500/70 ml-1">ชิ้น</span></div>
        </div>

        <div className="glass rounded-[1.5rem] p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group border-b-4 border-b-green-500/50">
          <div className="absolute top-0 right-0 p-4 text-green-500 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpFromLine className="w-24 h-24" />
          </div>
          <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider">เบิกออก/ขายวันนี้</div>
          <div className="text-4xl font-extrabold mt-3 text-green-500 drop-shadow-sm">-{outboundToday.toLocaleString()} <span className="text-sm font-medium text-green-500/70 ml-1">ชิ้น</span></div>
        </div>

        <div className="glass bg-red-500/5 border-red-500/20 rounded-[1.5rem] p-6 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 text-red-500 opacity-10 group-hover:opacity-20 transition-opacity animate-pulse">
            <AlertTriangle className="w-24 h-24" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
          <div className="text-red-500/80 text-sm font-bold uppercase tracking-wider relative z-10">ใกล้หมดสต๊อก (Low Stock)</div>
          <div className="text-4xl font-extrabold mt-3 text-red-500 relative z-10 drop-shadow-md">{lowStockCount} <span className="text-sm font-medium text-red-500/70 ml-1">รายการ</span></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock List */}
        <div className="glass rounded-[1.5rem] shadow-sm p-6 min-h-[400px] flex flex-col">
          <h2 className="font-extrabold text-lg mb-6 text-foreground flex items-center gap-3 border-b border-border pb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" /> สินค้าที่ต้องสั่งเพิ่ม
          </h2>
          {inventoryStatus.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-10 opacity-60">
              <Package className="w-12 h-12 mb-3" />
              <p className="font-medium">ไม่มีสินค้าคงคลังต่ำ</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {inventoryStatus.slice(0, 8).map((inv: any) => (
                <div key={inv.id} className="flex justify-between items-center p-3 bg-background/50 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="truncate pr-4">
                    <div className="font-bold text-foreground text-sm truncate">{inv.product.name}</div>
                  </div>
                  <div className={`font-extrabold px-3 py-1 rounded-lg text-sm whitespace-nowrap shadow-sm ${inv.quantity <= 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20'}`}>
                    {inv.quantity} ชิ้น
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass rounded-[1.5rem] shadow-sm p-6 lg:col-span-2 min-h-[400px] flex flex-col">
          <h2 className="font-extrabold text-lg mb-6 text-foreground flex items-center gap-3 border-b border-border pb-4">
            <TrendingUp className="w-5 h-5 text-primary" /> รายการเคลื่อนไหวล่าสุด
          </h2>
          {recentTransactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-10 opacity-60">
              <Activity className="w-12 h-12 mb-3" />
              <p className="font-medium">ยังไม่มีการเคลื่อนไหวของสต๊อก</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-start p-4 bg-background/50 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-extrabold tracking-wider ${
                        tx.type === 'INBOUND' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        tx.type === 'OUTBOUND' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">{format(tx.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                      <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{tx.reference}</span>
                    </div>
                    <div className="text-sm font-medium text-foreground mt-3 space-y-1">
                      {tx.items.slice(0, 2).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          {item.product.name}
                        </div>
                      ))}
                      {tx.items.length > 2 && <div className="text-muted-foreground text-xs mt-2 font-semibold pl-3">และอื่นๆ อีก {tx.items.length - 2} รายการ...</div>}
                    </div>
                  </div>
                  <div className={`font-black text-2xl drop-shadow-sm ${
                    tx.type === 'INBOUND' ? 'text-blue-500' :
                    tx.type === 'OUTBOUND' ? 'text-green-500' :
                    'text-red-500'
                  }`}>
                    {tx.type === 'INBOUND' ? '+' : '-'}{tx.items.reduce((sum: any, item: any) => sum + item.quantity, 0)}
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
