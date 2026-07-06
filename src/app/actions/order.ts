'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'

export async function parseOrderExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string; // 'SHOPEE' or 'TIKTOK'
    if (!file) return { error: 'No file uploaded' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    const ordersMap = new Map<string, any>();
    const uniqueSkus = new Set<string>();
    const skuContext: Record<string, { productName: string, variationName: string }> = {};

    for (const row of data) {
      // Shopee often uses 'หมายเลขคำสั่งซื้อ', TikTok might use 'Order ID'
      const orderId = String(row['Order ID'] || row['หมายเลขคำสั่งซื้อ'] || row['Order ID'] || '').trim();
      if (!orderId || orderId === 'undefined') continue;

      const trackingNo = String(row['Tracking No'] || row['หมายเลขติดตามพัสดุ'] || '').trim();
      
      let skuCode = String(row['SKU Reference'] || row['เลขรหัสอ้างอิง SKU (SKU Reference)'] || row['SKU'] || row['รหัสสินค้า'] || row['Seller SKU'] || '').trim();
      
      // Fallback: If seller never set a SKU, use Product Name + Variation Name as the identifier
      if (!skuCode || skuCode === 'undefined') {
        const productName = String(row['Product Name'] || row['ชื่อสินค้า'] || '').trim();
        const variationName = String(row['Variation Name'] || row['ชื่อตัวเลือกสินค้า'] || row['ชื่อตัวเลือก'] || '').trim();
        
        if (productName) {
          skuCode = productName;
          // Only append variation if it exists and isn't a placeholder like "No Variation"
          if (variationName && variationName !== 'undefined' && variationName !== 'No Variation') {
            skuCode += ` (${variationName})`;
          }
        }
      }

      const quantityStr = String(row['Quantity'] || row['จำนวน'] || '1').replace(/\D/g, '');
      const quantity = parseInt(quantityStr) || 1;

      const unitPriceStr = String(row['Deal Price'] || row['ราคาขาย'] || row['ราคาต่อหน่วย'] || row['ราคา'] || '0').replace(/[^0-9.]/g, '');
      const unitPrice = parseFloat(unitPriceStr) || 0;

      const totalAmountStr = String(row['Total Amount'] || row['ยอดสุทธิ'] || row['ยอดเงินที่ได้รับ'] || '0').replace(/[^0-9.]/g, '');
      const totalAmount = parseFloat(totalAmountStr) || 0;

      const feeStr = String(row['Selling Fee'] || row['ค่าธรรมเนียมการขาย'] || row['ค่าธรรมเนียมการทำธุรกรรม'] || row['ค่าธรรมเนียม'] || '0').replace(/[^0-9.]/g, '');
      const platformFee = parseFloat(feeStr) || 0;

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          trackingNo: trackingNo || null,
          totalAmount,
          platformFee,
          items: []
        });
      } else {
        const order = ordersMap.get(orderId);
        if (totalAmount > order.totalAmount) order.totalAmount = totalAmount;
        if (platformFee > order.platformFee) order.platformFee = platformFee;
      }

      if (skuCode && skuCode !== 'undefined') {
        uniqueSkus.add(skuCode);
        
        if (!skuContext[skuCode]) {
          const pName = String(row['Product Name'] || row['ชื่อสินค้า'] || '').trim();
          const vName = String(row['Variation Name'] || row['ชื่อตัวเลือกสินค้า'] || row['ชื่อตัวเลือก'] || '').trim();
          skuContext[skuCode] = {
            productName: pName || skuCode,
            variationName: vName
          };
        }

        const order = ordersMap.get(orderId);
        const existingItem = order.items.find((i: any) => i.skuCode === skuCode);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          order.items.push({ skuCode, quantity, unitPrice });
        }
      }
    }

    return { 
      success: true, 
      orders: Array.from(ordersMap.values()),
      uniqueSkus: Array.from(uniqueSkus),
      skuContext
    };
  } catch (error: any) {
    console.error('Excel parse error:', error);
    return { error: error.message };
  }
}

export async function checkMappedSkus(platform: string, skuCodes: string[]) {
  const skus = await prisma.sku.findMany({
    where: {
      platform,
      skuCode: { in: skuCodes }
    },
    include: {
      items: {
        include: { product: true }
      }
    }
  });
  return skus;
}

export async function mapPlatformSku(platform: string, skuCode: string, items: {productId: string, quantity: number}[]) {
  try {
    // Check if exists
    const existing = await prisma.sku.findUnique({
      where: { platform_skuCode: { platform, skuCode } }
    });

    if (existing) {
      // Update
      await prisma.skuItem.deleteMany({ where: { skuId: existing.id } });
      await prisma.skuItem.createMany({
        data: items.map(i => ({
          skuId: existing.id,
          productId: i.productId,
          quantity: i.quantity
        }))
      });
    } else {
      // Create
      await prisma.sku.create({
        data: {
          platform,
          skuCode,
          items: {
            create: items
          }
        }
      });
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function confirmOrdersAndDeductStock(platform: string, orders: any[]) {
  try {
    // We need a location to deduct from. Let's find or create MAIN_WH
    let location = await prisma.location.findFirst({ where: { type: 'MAIN_WH' } });
    if (!location) {
      location = await prisma.location.create({ data: { name: 'คลังสินค้าหลัก', type: 'MAIN_WH' } });
    }

    // Load all mapped SKUs for this platform
    const mappedSkus = await prisma.sku.findMany({
      where: { platform },
      include: { items: { include: { product: true } } }
    });
    const skuMap = new Map();
    for (const s of mappedSkus) {
      skuMap.set(s.skuCode, s.items);
    }

    let totalOrdersProcessed = 0;

    // Use a transaction
    await prisma.$transaction(async (tx) => {
      for (const o of orders) {
        // Skip if order already exists to prevent duplicate deduction
        const existingOrder = await tx.platformOrder.findUnique({ where: { orderId: o.orderId } });
        if (existingOrder) continue;

        // Create PlatformOrder
        const newOrder = await tx.platformOrder.create({
          data: {
            platform,
            orderId: o.orderId,
            trackingNo: o.trackingNo,
            status: 'PACKED', // Auto-marked as packed since they will handle physical packing manually
            totalAmount: o.totalAmount || 0,
            platformFee: o.platformFee || 0
          }
        });

        const transactionRef = `ONLINE-${platform}-${o.orderId}`;
        const outTransaction = await tx.transaction.create({
          data: {
            type: 'OUTBOUND',
            reference: transactionRef,
            notes: `Auto deduction for online order ${o.orderId}`
          }
        });

        for (const item of o.items) {
          let snapshotUnitCost = 0;
          const mappedItems = skuMap.get(item.skuCode);
          
          if (mappedItems) {
            for (const mapped of mappedItems) {
              snapshotUnitCost += (mapped.product.currentAvgCost || 0) * mapped.quantity;
            }
          }

          // Record what was ordered
          await tx.platformOrderItem.create({
            data: {
              orderId: newOrder.id,
              skuCode: item.skuCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice || 0,
              unitCost: snapshotUnitCost
            }
          });

          // Deduct stock based on mapping
          if (mappedItems) {
            for (const mapped of mappedItems) {
              const deductQty = mapped.quantity * item.quantity;
              
              // Record Transaction Item
              await tx.transactionItem.create({
                data: {
                  transactionId: outTransaction.id,
                  productId: mapped.productId,
                  locationId: location!.id,
                  quantity: deductQty
                }
              });

              // Update Inventory
              const inv = await tx.inventory.findUnique({
                where: { productId_locationId: { productId: mapped.productId, locationId: location!.id } }
              });

              if (inv) {
                await tx.inventory.update({
                  where: { id: inv.id },
                  data: { quantity: inv.quantity - deductQty }
                });
              } else {
                await tx.inventory.create({
                  data: {
                    productId: mapped.productId,
                    locationId: location!.id,
                    quantity: -deductQty
                  }
                });
              }
            }
          }
        }
        totalOrdersProcessed++;
      }
    });

    revalidatePath('/orders');
    return { success: true, count: totalOrdersProcessed };
  } catch (error: any) {
    console.error('Order confirm error:', error);
    return { error: error.message };
  }
}
