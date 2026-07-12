// Import Shopee catalog from mass_update export files into PlatformProduct.
// Usage: node --env-file=.env import_shopee.js <sales_info.xlsx> [basic_info.xlsx]
// Safe to re-run: upserts by (platform, itemId, variationId).
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function readRows(file) {
  const wb = xlsx.readFile(file);
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  // Shopee mass_update files: metadata rows on top, data rows start where col0 is a numeric item id
  return rows.filter(r => r[0] && /^\d{6,}$/.test(String(r[0]).trim()));
}

async function main() {
  const salesFile = process.argv[2];
  const basicFile = process.argv[3];
  if (!salesFile) { console.error('ระบุไฟล์ sales_info'); process.exit(1); }

  let upserted = 0;

  // sales_info: [itemId, itemName, variationId, variationName, parentSku, variationSku, price, gtin, stock]
  for (const r of readRows(salesFile)) {
    const itemId = String(r[0]).trim();
    const itemName = String(r[1] || '').trim();
    const variationId = String(r[2] || '').trim();
    const variationName = String(r[3] || '').trim() || null;
    const price = parseFloat(String(r[6] || '0').replace(/[^0-9.]/g, '')) || 0;
    const stock = parseInt(String(r[8] || '0').replace(/\D/g, '')) || 0;
    if (!itemName) continue;

    await prisma.platformProduct.upsert({
      where: { platform_itemId_variationId: { platform: 'SHOPEE', itemId, variationId } },
      update: { itemName, variationName, price, stock },
      create: { platform: 'SHOPEE', itemId, variationId, itemName, variationName, price, stock }
    });
    upserted++;
  }

  // basic_info: [itemId, parentSku, itemName] — catch listings that have no variation rows
  if (basicFile) {
    for (const r of readRows(basicFile)) {
      const itemId = String(r[0]).trim();
      const itemName = String(r[2] || '').trim();
      if (!itemName) continue;
      const exists = await prisma.platformProduct.findFirst({ where: { platform: 'SHOPEE', itemId } });
      if (!exists) {
        await prisma.platformProduct.create({
          data: { platform: 'SHOPEE', itemId, variationId: '', itemName }
        });
        upserted++;
      }
    }
  }

  const total = await prisma.platformProduct.count({ where: { platform: 'SHOPEE' } });
  console.log(`upserted ${upserted} rows, total SHOPEE catalog: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
