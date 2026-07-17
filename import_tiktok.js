// Import TikTok catalog from Seller Center batch-edit files into PlatformProduct.
// Usage: node --env-file=.env import_tiktok.js "<folder with .xlsx files>"
// Safe to re-run: upserts by (platform, itemId, variationId=sku_id).
// Note: TikTok writes a stale <dimension> (claims 5 rows) — recompute !ref from real cells.
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function fixRef(ws) {
  let maxR = 0, maxC = 0;
  for (const k of Object.keys(ws)) {
    if (k[0] === '!') continue;
    const m = k.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const c = xlsx.utils.decode_col(m[1]);
    const r = parseInt(m[2]) - 1;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  ws['!ref'] = xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
}

async function main() {
  const folder = process.argv[2];
  if (!folder) { console.error('ระบุโฟลเดอร์ไฟล์ TikTok'); process.exit(1); }

  let upserted = 0;
  for (const f of fs.readdirSync(folder).filter(x => x.endsWith('.xlsx'))) {
    const wb = xlsx.readFile(path.join(folder, f), { sheets: ['Template'] });
    const ws = wb.Sheets['Template'];
    if (!ws) continue;
    fixRef(ws);
    const raw = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const header = raw[0] || [];
    const idx = {};
    header.forEach((h, i) => { idx[h] = i; });
    if (idx['product_name'] === undefined) continue;

    // แถว 1-5 เป็นหัวตาราง/คำอธิบาย ข้อมูลจริงเริ่มแถว 6 (index 5)
    for (let i = 5; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[idx['product_id']] || !r[idx['product_name']]) continue;
      const itemId = String(r[idx['product_id']]).trim();
      const itemName = String(r[idx['product_name']]).trim();
      const variationId = String(r[idx['sku_id']] || '').trim();
      let variationName = String(r[idx['variation_value']] || '').trim() || null;
      // 'Default' / '-, -' = ไม่มีตัวเลือกจริง
      if (variationName === 'Default' || variationName === '-, -') variationName = null;
      const price = parseFloat(String(r[idx['price']] || '0').replace(/[^0-9.]/g, '')) || 0;
      const stock = parseInt(String(r[idx['quantity']] || '0').replace(/\D/g, '')) || 0;

      await prisma.platformProduct.upsert({
        where: { platform_itemId_variationId: { platform: 'TIKTOK', itemId, variationId } },
        update: { itemName, variationName, price, stock },
        create: { platform: 'TIKTOK', itemId, variationId, itemName, variationName, price, stock }
      });
      upserted++;
    }
    console.log(f, '→ done');
  }

  const total = await prisma.platformProduct.count({ where: { platform: 'TIKTOK' } });
  console.log(`upserted ${upserted} rows, total TIKTOK catalog: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
