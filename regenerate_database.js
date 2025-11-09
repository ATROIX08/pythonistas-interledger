#!/usr/bin/env node
/**
 * Script para regenerar la base de datos con los nuevos datos de Humberto
 * 
 * Uso: node regenerate_database.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'open-payments', 'wallets.db');

console.log('\n🔄 Regenerando base de datos...\n');

// Verificar si la base de datos existe
if (fs.existsSync(DB_PATH)) {
  console.log('📋 Base de datos existente encontrada, eliminando...');
  fs.unlinkSync(DB_PATH);
  console.log('✅ Base de datos eliminada\n');
}

// Crear nueva base de datos
console.log('📦 Creando nueva base de datos...');
const db = new Database(DB_PATH);

// Crear tabla con nueva estructura
db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_name TEXT NOT NULL,
    wallet_url TEXT NOT NULL,
    is_dummy INTEGER DEFAULT 0,
    owner TEXT
  )
`);

console.log('✅ Tabla creada\n');

// Insertar datos
console.log('📝 Insertando datos...\n');
const insert = db.prepare('INSERT INTO wallets (public_name, wallet_url, is_dummy, owner) VALUES (?, ?, ?, ?)');

const initialData = [
  // Wallets reales de Humberto
  ['humberto_remesa', 'https://ilp.interledger-test.dev/remesa', 0, 'humberto_wallet'],
  ['humberto_fdb7ac10', 'https://ilp.interledger-test.dev/fdb7ac10', 0, 'humberto_wallet'],
  ['humberto_pachuca', 'https://ilp.interledger-test.dev/pachucacampeon', 0, 'humberto_wallet'],
  ['humberto_soledad', 'https://ilp.interledger-test.dev/soledad', 0, 'humberto_wallet'],
  ['humberto_locura', 'https://ilp.interledger-test.dev/locura', 0, 'humberto_wallet'],
  
  // Wallets dummy (para ejemplo)
  ['alice_wallet', 'https://ilp.interledger-test.dev/alice-wallet-id', 1, null],
  ['bob_store', 'https://ilp.interledger-test.dev/bob-store-id', 1, null],
  ['charlie_savings', 'https://ilp.interledger-test.dev/charlie-savings-id', 1, null]
];

console.log('✅ Wallets Reales de Humberto:');
for (const [name, url, isDummy, owner] of initialData) {
  if (!isDummy) {
    insert.run(name, url, isDummy, owner);
    console.log(`   - ${name}: ${url}`);
  }
}

console.log('\n⚠️  Wallets Dummy (Solo ejemplo):');
for (const [name, url, isDummy, owner] of initialData) {
  if (isDummy) {
    insert.run(name, url, isDummy, owner);
    console.log(`   - ${name}: ${url}`);
  }
}

db.close();

console.log('\n✅ Base de datos regenerada exitosamente!');
console.log('\n📊 Resumen:');
console.log('   - 5 wallets reales de Humberto');
console.log('   - 3 wallets dummy de ejemplo');
console.log(`\n📁 Ubicación: ${DB_PATH}`);
console.log('\n🚀 Ahora puedes iniciar el servidor: npm run server\n');

