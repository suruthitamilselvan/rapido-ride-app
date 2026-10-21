const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const target = (process.argv[2] || 'postgresql').toLowerCase();

if (!fs.existsSync(schemaPath)) {
  console.error('schema.prisma not found at:', schemaPath);
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf8');

if (target.includes('postgre') || target === 'pg') {
  content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('✓ Prisma provider successfully set to: postgresql (for Neon/Supabase/Cloud)');
} else if (target === 'sqlite') {
  content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('✓ Prisma provider successfully set to: sqlite (for local runs)');
} else {
  console.log('Unknown provider target:', target);
}
