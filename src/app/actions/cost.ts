'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx-js-style'

export async function exportCosts(productIds: string[]) {
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        viscosity: true,
        size: true,
        qtyPerCarton: true,
        currentAvgCost: true
      }
    });

    const data = products.map(p => ({
      'Product ID': p.id,
      'ชื่อสินค้า': p.name,
      'ยี่ห้อ': p.brand || '-',
      'รุ่น': p.model || '-',
      'เบอร์ความหนืด': p.viscosity || '-',
      'ขนาด': p.size || '-',
      'ทุนเดิม/ลัง (บาท)': (p.currentAvgCost || 0) * (p.qtyPerCarton || 1),
      'จำนวน/ลัง': p.qtyPerCarton || 1,
      'ทุนเดิม/ชิ้น (บาท)': p.currentAvgCost || 0,
      'ทุนใหม่/ลัง (บาท)': '', // Empty for user to fill
      'ทุนใหม่/ชิ้น (บาท)': '' // Empty for user to fill
    }));

    const ws = xlsx.utils.json_to_sheet(data);

    // Apply protection
    ws['!protect'] = { password: 'simoil', selectLockedCells: true };

    // Set styles
    const range = xlsx.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: R };
        const cellRef = xlsx.utils.encode_cell(cellAddress);
        if (!ws[cellRef]) continue;

        // Default style for locked cells
        if (!ws[cellRef].s) ws[cellRef].s = {};
        
        // Headers
        if (R === 0) {
          ws[cellRef].s.fill = { fgColor: { rgb: "FF1E293B" } };
          ws[cellRef].s.font = { color: { rgb: "FFFFFFFF" }, bold: true };
          ws[cellRef].s.protection = { locked: true };
        } else {
          // Data rows
          if (C === 9 || C === 10) { // Editable columns (New Carton, New Piece)
            ws[cellRef].s.protection = { locked: false };
            ws[cellRef].s.fill = { fgColor: { rgb: "FFFFFBEB" } }; // Light amber background to show it's editable
            ws[cellRef].s.border = { top: { style: 'thin', color: { auto: 1 } }, bottom: { style: 'thin', color: { auto: 1 } }, left: { style: 'thin', color: { auto: 1 } }, right: { style: 'thin', color: { auto: 1 } } };
          } else {
            ws[cellRef].s.protection = { locked: true };
            ws[cellRef].s.fill = { fgColor: { rgb: "FFF1F5F9" } }; // Light slate for locked
          }
        }
      }
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // ID
      { wch: 40 }, // Name
      { wch: 15 }, // Brand
      { wch: 15 }, // Model
      { wch: 15 }, // Viscosity
      { wch: 10 }, // Size
      { wch: 20 }, // Current Carton
      { wch: 10 }, // Qty/Carton
      { wch: 20 }, // Current Piece
      { wch: 20 }, // New Carton
      { wch: 20 }  // New Piece
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Costs');

    const base64 = xlsx.write(wb, { bookType: 'xlsx', type: 'base64' });
    return { success: true, base64 };
  } catch (error: any) {
    console.error('Export error:', error);
    return { error: error.message };
  }
}

export async function importCosts(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { error: 'ไม่มีไฟล์ถูกอัปโหลด' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    let updateCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of data) {
        const productId = row['Product ID'];
        const newCostCartonStr = row['ทุนใหม่/ลัง (บาท)'];
        const newCostPieceStr = row['ทุนใหม่/ชิ้น (บาท)'];
        
        if (!productId) continue;

        let finalNewCost = undefined;

        if (newCostPieceStr !== undefined && newCostPieceStr !== '') {
          finalNewCost = parseFloat(String(newCostPieceStr).replace(/[^0-9.]/g, ''));
        } else if (newCostCartonStr !== undefined && newCostCartonStr !== '') {
          const cartonCost = parseFloat(String(newCostCartonStr).replace(/[^0-9.]/g, ''));
          const qtyPerCarton = parseInt(String(row['จำนวน/ลัง'])) || 1;
          finalNewCost = cartonCost / qtyPerCarton;
        }

        if (finalNewCost !== undefined && !isNaN(finalNewCost)) {
          await tx.product.update({
            where: { id: String(productId) },
            data: { currentAvgCost: finalNewCost }
          });
          updateCount++;
        }
      }
    });

    revalidatePath('/costs');
    revalidatePath('/products');
    revalidatePath('/analytics');

    return { success: true, count: updateCount };
  } catch (error: any) {
    console.error('Import error:', error);
    return { error: 'เกิดข้อผิดพลาดในการนำเข้าไฟล์: ' + error.message };
  }
}

export async function updateSingleCost(productId: string, newCostPiece: number) {
  try {
    if (isNaN(newCostPiece) || newCostPiece < 0) {
      return { error: 'ราคาทุนไม่ถูกต้อง' };
    }
    await prisma.product.update({
      where: { id: productId },
      data: { currentAvgCost: newCostPiece }
    });
    revalidatePath('/costs');
    revalidatePath('/products');
    revalidatePath('/analytics');
    return { success: true };
  } catch (error: any) {
    console.error('Update cost error:', error);
    return { error: error.message };
  }
}
