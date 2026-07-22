'use server'

import { prisma } from '@/lib/prisma'

// อัตรา VAT ที่ใช้คำนวณกำไรสุทธิหลังหัก VAT เต็มรูป
const VAT_RATE = 7
const VAT_DIVISOR = (100 + VAT_RATE) / 100  // 1.07

// เกณฑ์กำไรขั้นต่ำที่ยอมรับได้ (% ของทุน) — ต่ำกว่านี้ถือว่าควรทบทวนราคา
const LOW_MARGIN_THRESHOLD = 8

export type ProductPerf = {
  skuCode: string
  revenue: number
  cost: number
  fee: number
  /** กำไรก่อนหัก VAT = ยอดขาย - ทุน - ค่าธรรมเนียม */
  profitBeforeVat: number
  /** กำไรสุทธิหลังหัก VAT เต็มรูป = (ยอดขาย - ทุน - ค่าธรรมเนียม) x 100/107 */
  profit: number
  /** % กำไรเทียบกับ "ทุน" (ตรงกับสูตรในตารางราคาขาย ไม่ใช่ % จากยอดขาย) */
  marginOnCost: number
  qty: number
}

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

  const productPerformance = new Map<string, ProductPerf>();

  for (const o of orders) {
    totalRevenue += o.totalAmount;
    totalFees += o.platformFee;

    // ค่าธรรมเนียมเก็บมาเป็นยอดรวมต่อออเดอร์ จึงต้องเฉลี่ยลงรายสินค้า
    // วิธีเฉลี่ย: ตามสัดส่วนยอดขายของสินค้านั้นในออเดอร์ (เป็นการประมาณ ไม่ใช่ค่าจริงรายชิ้น)
    const orderItemsRevenue = o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const feeBase = orderItemsRevenue > 0 ? orderItemsRevenue : o.totalAmount;

    for (const item of o.items) {
      const rev = item.unitPrice * item.quantity;
      const cst = item.unitCost * item.quantity;
      const fee = feeBase > 0 ? o.platformFee * (rev / feeBase) : 0;
      totalCost += cst;

      if (!productPerformance.has(item.skuCode)) {
        productPerformance.set(item.skuCode, {
          skuCode: item.skuCode, revenue: 0, cost: 0, fee: 0,
          profitBeforeVat: 0, profit: 0, marginOnCost: 0, qty: 0
        });
      }
      const perf = productPerformance.get(item.skuCode)!;
      perf.revenue += rev;
      perf.cost += cst;
      perf.fee += fee;
      perf.qty += item.quantity;
    }
  }

  // คำนวณกำไรรายสินค้าหลังรวมยอดครบทุกออเดอร์แล้ว
  for (const perf of productPerformance.values()) {
    perf.profitBeforeVat = perf.revenue - perf.cost - perf.fee;
    perf.profit = perf.profitBeforeVat / VAT_DIVISOR;
    perf.marginOnCost = perf.cost > 0 ? (perf.profit / perf.cost) * 100 : 0;
  }

  // ---- ยอดรวม ----
  const profitBeforeVat = totalRevenue - totalCost - totalFees;
  /** กำไรสุทธิหลังหัก VAT เต็มรูป — ตัวเลขที่ใช้ตัดสินใจ ตรงกับสูตรในตารางราคาขาย */
  const netProfitAfterVat = profitBeforeVat / VAT_DIVISOR;
  /** % กำไรเทียบ "ทุน" (สูตรมาตรฐานของร้าน) */
  const marginOnCost = totalCost > 0 ? (netProfitAfterVat / totalCost) * 100 : 0;
  /** % กำไรเทียบ "ยอดขาย" (ไว้ดูประกอบ) */
  const marginOnRevenue = totalRevenue > 0 ? (netProfitAfterVat / totalRevenue) * 100 : 0;
  /** ภาษีซื้อที่ขอคืนได้จากทุน */
  const inputVat = totalCost * VAT_RATE / (100 + VAT_RATE);

  const sortedPerformance = Array.from(productPerformance.values()).sort((a, b) => b.profit - a.profit);

  return {
    totalRevenue,
    totalCost,
    totalFees,
    inputVat,
    profitBeforeVat,
    netProfitAfterVat,
    marginOnCost,
    marginOnRevenue,
    orderCount: orders.length,
    lowMarginThreshold: LOW_MARGIN_THRESHOLD,
    topProducts: sortedPerformance.slice(0, 10),
    /** สินค้าที่ขาดทุนจริง (กำไรหลัง VAT ติดลบ) */
    lossProducts: sortedPerformance.filter(p => p.profit < 0),
    /** สินค้ากำไรบางกว่าเกณฑ์ แต่ยังไม่ขาดทุน — ควรทบทวนราคา */
    lowMarginProducts: sortedPerformance.filter(
      p => p.profit >= 0 && p.cost > 0 && p.marginOnCost < LOW_MARGIN_THRESHOLD
    ),

    // ---- ชื่อเดิม เก็บไว้กันโค้ดส่วนอื่นพัง ----
    /** @deprecated ใช้ netProfitAfterVat แทน */
    grossProfit: netProfitAfterVat,
    /** @deprecated ใช้ marginOnCost แทน */
    netProfitMargin: marginOnCost,
  };
}
