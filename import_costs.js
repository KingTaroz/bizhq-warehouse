const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const workbook = xlsx.readFile('C:\\Users\\taro\\inventory-system\\ราคาทุน.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // Skip the first row (title), use the second row as header
  const data = xlsx.utils.sheet_to_json(worksheet, { range: 1 });

  console.log(`Found ${data.length} rows to import.`);

  let importedCount = 0;
  for (const row of data) {
    const brand = row['ยี่ห้อ'] ? String(row['ยี่ห้อ']).trim() : null;
    const name = row['รุ่น'] ? String(row['รุ่น']).trim() : null;
    const viscosity = row['เบอร์ความหนืด'] ? String(row['เบอร์ความหนืด']).trim() : null;
    const size = row['ขนาด'] ? String(row['ขนาด']).trim() : null;
    let qtyPerCarton = parseInt(row['จำนวน/ลัง']);
    if (isNaN(qtyPerCarton) || qtyPerCarton <= 0) qtyPerCarton = 1;
    let currentAvgCost = parseFloat(row['ทุน/ชิ้น (บาท)']);
    if (isNaN(currentAvgCost) || currentAvgCost < 0) currentAvgCost = 0;

    if (!name) continue; // Skip if no name

    await prisma.product.create({
      data: {
        brand: brand || '',
        name,
        viscosity,
        size,
        qtyPerCarton,
        currentAvgCost,
      }
    });
    importedCount++;
  }

  console.log(`Successfully imported ${importedCount} products.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
