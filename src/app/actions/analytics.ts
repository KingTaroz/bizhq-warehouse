'use server'

import { prisma } from '@/lib/prisma'

export async function getAnalyticsOverview(dateRange: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL' = 'MONTH') {
  let dateFilter = {};
  const now = new Date();
  if (dateRange === 'TODAY') {
    now.setHours(0, 0, 0, 0);
    dateFilter = { gte: now };
  } else if (dateRange === 'WEEK') {
    now.setDate(now.getDate() - 7);
    dateFilter = { gte: now };
  } else if (dateRange === 'MONTH') {
    now.setMonth(now.getMonth() - 1);
    dateFilter = { gte: now };
  }

  // ใช้วันขายจริง (orderDate) ถ้ามี — ออเดอร์เก่าที่ไม่มี orderDate ใช้วันอัปโหลดแทน
  // และไม่นับออเดอร์ที่ยกเลิก/คืนของ
  const orders = await prisma.platformOrder.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'RETURNED'] },
      ...(dateRange === 'ALL' ? {} : {
        OR: [
          { orderDate: dateFilter },
          { orderDate: null, createdAt: dateFilter }
        ]
      })
    },
    include: { items: true }
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalFees = 0;

  const productPerformance = new Map<string, { skuCode: string, revenue: number, cost: number, profit: number, qty: number }>();

  for (const o of orders) {
    totalRevenue += o.totalAmount;
    totalFees += o.platformFee;

    for (const item of o.items) {
      const rev = item.unitPrice * item.quantity;
      const cst = item.unitCost * item.quantity;
      totalCost += cst;

      if (!productPerformance.has(item.skuCode)) {
        productPerformance.set(item.skuCode, { skuCode: item.skuCode, revenue: 0, cost: 0, profit: 0, qty: 0 });
      }
      const perf = productPerformance.get(item.skuCode)!;
      perf.revenue += rev;
      perf.cost += cst;
      // We calculate raw item profit here (before overall order fees)
      perf.profit += (rev - cst);
      perf.qty += item.quantity;
    }
  }

  const grossProfit = totalRevenue - totalCost - totalFees;
  const netProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const sortedPerformance = Array.from(productPerformance.values()).sort((a, b) => b.profit - a.profit);

  return {
    totalRevenue,
    totalCost,
    totalFees,
    grossProfit,
    netProfitMargin,
    orderCount: orders.length,
    topProducts: sortedPerformance.slice(0, 10),
    lossProducts: sortedPerformance.filter(p => p.profit < 0)
  };
}
