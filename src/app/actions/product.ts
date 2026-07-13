'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as xlsx from 'xlsx'

export async function getProducts() {
  return await prisma.product.findMany({
    include: {
      barcodes: true,
      skuItems: true,
      inventory: {
        include: { location: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDistinctOptions() {
  const brands = await prisma.product.findMany({
    where: { brand: { not: '' } },
    distinct: ['brand'],
    select: { brand: true }
  });
  // "รุ่น" ตอนนี้เก็บในฟิลด์ name — datalist autocomplete ดึงจาก name
  const models = await prisma.product.findMany({
    where: { name: { not: '' } },
    distinct: ['name'],
    select: { name: true }
  });
  const viscosities = await prisma.product.findMany({
    where: { viscosity: { not: '' } },
    distinct: ['viscosity'],
    select: { viscosity: true }
  });
  const sizes = await prisma.product.findMany({
    where: { size: { not: '' } },
    distinct: ['size'],
    select: { size: true }
  });
  const categories = await prisma.product.findMany({
    where: { category: { not: '' } },
    distinct: ['category'],
    select: { category: true }
  });
  return {
    brands: brands.map(b => b.brand).filter(Boolean) as string[],
    models: models.map(m => m.name).filter(Boolean) as string[],
    viscosities: viscosities.map(v => v.viscosity).filter(Boolean) as string[],
    sizes: sizes.map(s => s.size).filter(Boolean) as string[],
    categories: categories.map(c => c.category).filter(Boolean) as string[]
  };
}

export async function createProduct(formData: FormData) {
  try {
    const brand = formData.get('brand') as string;
    // ฟอร์มส่ง "รุ่น" มาเป็น name โดยตรง (เลิกใช้ field model แล้ว)
    const name = (formData.get('name') as string) || 'Unnamed Product';
    const viscosity = formData.get('viscosity') as string;
    const size = formData.get('size') as string;
    const qtyPerCarton = parseInt(formData.get('qtyPerCarton') as string) || 1;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    const bottleBarcode = formData.get('bottleBarcode') as string;
    const cartonBarcode = formData.get('cartonBarcode') as string;

    const product = await prisma.product.create({
      data: {
        name,
        brand,
        viscosity,
        size,
        qtyPerCarton,
        category,
        description,
      }
    });

    if (bottleBarcode) {
      await prisma.barcode.create({
        data: {
          code: bottleBarcode,
          productId: product.id,
          type: 'BOTTLE',
          multiplier: 1
        }
      });
    }

    if (cartonBarcode) {
      await prisma.barcode.create({
        data: {
          code: cartonBarcode,
          productId: product.id,
          type: 'CARTON',
          multiplier: qtyPerCarton
        }
      });
    }

    revalidatePath('/products');
    return { success: true, product };
  } catch (error: any) {
    console.error('createProduct ERROR:', error);
    return { error: 'เกิดข้อผิดพลาดในการสร้างสินค้า: ' + error.message };
  }
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath('/products');
  return { success: true };
}

export async function verifyAndDeleteProduct(id: string, adminPasswordInput: string) {
  try {
    // Check if the provided password matches the admin's password
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser || adminUser.password !== adminPasswordInput) {
      return { error: 'รหัสผ่านเจ้าของร้านไม่ถูกต้อง (Invalid Admin Password)' };
    }

    // Password is correct, proceed to delete
    await prisma.product.delete({ where: { id } });
    revalidatePath('/products');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// อ่านค่าจาก row โดยลองหลายชื่อคอลัมน์ (ไทย/อังกฤษ)
function pick(row: any, keys: string[]): string | null {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return null;
}

export async function importProductsExcel(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { error: 'No file uploaded' };

    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // หาแถวหัวตารางอัตโนมัติ — ข้ามแถวหัวเรื่อง/คำอธิบายด้านบน
    const raw = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const HEADER_HINTS = ['ยี่ห้อ', 'รุ่น', 'Brand', 'Name', 'Model'];
    const headerRow = raw.findIndex(r =>
      Array.isArray(r) && r.some(c => HEADER_HINTS.includes(String(c).trim()))
    );
    if (headerRow === -1) {
      return { error: 'ไม่พบหัวตาราง (ต้องมีคอลัมน์ ยี่ห้อ/รุ่น หรือ Brand/Name)' };
    }

    const data = xlsx.utils.sheet_to_json(sheet, { range: headerRow }) as any[];

    let successCount = 0;

    for (const row of data) {
      const brand = pick(row, ['ยี่ห้อ', 'Brand']);
      const viscosity = pick(row, ['เบอร์ความหนืด', 'Viscosity']);
      const size = pick(row, ['ขนาด', 'Size']);
      const qty = parseInt(pick(row, ['จำนวน/ลัง', 'QtyPerCarton']) || '1') || 1;
      const costStr = pick(row, ['ทุน/ชิ้น (บาท)', 'Cost', 'CurrentAvgCost']);
      const currentAvgCost = costStr ? parseFloat(costStr.replace(/[^0-9.]/g, '')) || 0 : 0;

      // "รุ่น" เก็บในฟิลด์ name — มาจากคอลัมน์ รุ่น/Name/Model
      let name = pick(row, ['รุ่น', 'Name', 'Model']);
      if (!name) {
        const nameParts = [brand, viscosity, size].filter(Boolean);
        // ไม่มีรุ่นและไม่มีข้อมูลอื่นเลย → ข้ามแถวนี้ (กันแถวว่าง/แถวสรุป)
        if (nameParts.length === 0) continue;
        name = nameParts.join(' ') + (qty > 1 ? ` (${qty}/ลัง)` : '');
      }

      const product = await prisma.product.create({
        data: {
          name,
          brand,
          viscosity,
          size,
          qtyPerCarton: qty,
          currentAvgCost,
          category: pick(row, ['Category', 'หมวดหมู่']),
          description: pick(row, ['Description', 'รายละเอียด']),
        }
      });

      if (row['BottleBarcode']) {
        const code = String(row['BottleBarcode']);
        const existingBarcode = await prisma.barcode.findUnique({ where: { code } });
        if (!existingBarcode) {
          await prisma.barcode.create({
            data: {
              productId: product.id,
              code,
              type: 'BOTTLE',
              multiplier: 1
            }
          });
        }
      }

      if (row['CartonBarcode']) {
        const code = String(row['CartonBarcode']);
        const existingBarcode = await prisma.barcode.findUnique({ where: { code } });
        if (!existingBarcode) {
          await prisma.barcode.create({
            data: {
              productId: product.id,
              code,
              type: 'CARTON',
              multiplier: qty
            }
          });
        }
      }

      successCount++;
    }

    revalidatePath('/products');
    return { success: true, count: successCount };
  } catch (error: any) {
    console.error('Excel import error:', error);
    return { error: error.message };
  }
}

export async function addBarcodeToProduct(productId: string, code: string, type: 'BOTTLE' | 'CARTON', multiplier: number = 1) {
  try {
    const existing = await prisma.barcode.findUnique({ where: { code } });
    if (existing) {
      return { error: 'บาร์โค้ดนี้ถูกใช้งานแล้วในระบบ' };
    }

    await prisma.barcode.create({
      data: {
        productId,
        code,
        type,
        multiplier
      }
    });

    revalidatePath('/products');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteBarcode(id: string) {
  try {
    await prisma.barcode.delete({ where: { id } });
    revalidatePath('/products');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateProductStock(productId: string, newTotalStock: number) {
  try {
    if (isNaN(newTotalStock) || newTotalStock < 0) {
      return { error: 'จำนวนสต๊อกไม่ถูกต้อง' };
    }

    const inventories = await prisma.inventory.findMany({
      where: { productId }
    });

    const currentTotal = inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    const difference = newTotalStock - currentTotal;
    
    if (difference !== 0) {
      if (inventories.length > 0) {
        await prisma.inventory.update({
          where: { id: inventories[0].id },
          data: { quantity: Math.max(0, inventories[0].quantity + difference) }
        });
      } else {
        let location = await prisma.location.findFirst();
        if (!location) {
          location = await prisma.location.create({ data: { name: 'Main Warehouse', type: 'WAREHOUSE' } });
        }
        await prisma.inventory.create({
          data: {
            productId,
            locationId: location.id,
            quantity: newTotalStock
          }
        });
      }
    }

    revalidatePath('/products');
    return { success: true };
  } catch (error: any) {
    console.error('Update stock error:', error);
    return { error: error.message };
  }
}
