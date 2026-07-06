const xlsx = require('xlsx-js-style');
const fs = require('fs');

const fileBuffer = fs.readFileSync('ราคาทุน Test.xlsx');
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers from the Excel file:');
console.log(data[0]);
console.log('First data row:');
console.log(data[1]);
