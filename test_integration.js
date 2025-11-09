#!/usr/bin/env node
/**
 * Script de prueba para verificar la integración del sistema de nombres públicos
 * 
 * Uso: node test_integration.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función helper para hacer peticiones HTTP
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Tests
async function runTests() {
  log('\n🧪 INICIANDO PRUEBAS DE INTEGRACIÓN\n', 'cyan');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Verificar que el servidor está corriendo
  try {
    log('Test 1: Verificar estado del servidor...', 'blue');
    const response = await makeRequest('GET', '/api/status');
    
    if (response.status === 200 && response.data.status === 'ok') {
      log('✅ Test 1 PASADO: Servidor funcionando correctamente', 'green');
      passedTests++;
    } else {
      log('❌ Test 1 FALLIDO: Servidor no responde correctamente', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 1 FALLIDO: ${error.message}`, 'red');
    log('⚠️  Asegúrate de que el servidor esté corriendo (npm run server)', 'yellow');
    failedTests++;
    return;
  }
  
  // Test 2: Listar wallets registradas
  try {
    log('\nTest 2: Listar wallets registradas...', 'blue');
    const response = await makeRequest('GET', '/api/wallets-db');
    
    if (response.status === 200 && response.data.success && Array.isArray(response.data.wallets)) {
      log(`✅ Test 2 PASADO: ${response.data.count} wallets encontradas`, 'green');
      passedTests++;
    } else {
      log('❌ Test 2 FALLIDO: No se pudieron listar las wallets', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 2 FALLIDO: ${error.message}`, 'red');
    failedTests++;
  }
  
  // Test 3: Buscar usuario por nombre público (humberto_wallet)
  try {
    log('\nTest 3: Buscar usuario "humberto_wallet"...', 'blue');
    const response = await makeRequest('GET', '/api/user/humberto_wallet');
    
    if (response.status === 200 && response.data.success) {
      log('✅ Test 3 PASADO: Usuario encontrado', 'green');
      log(`   Nombre: ${response.data.data.publicName}`, 'cyan');
      log(`   URL: ${response.data.data.walletUrl}`, 'cyan');
      passedTests++;
    } else {
      log('❌ Test 3 FALLIDO: Usuario no encontrado', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 3 FALLIDO: ${error.message}`, 'red');
    failedTests++;
  }
  
  // Test 4: Buscar usuario inexistente
  try {
    log('\nTest 4: Buscar usuario inexistente...', 'blue');
    const response = await makeRequest('GET', '/api/user/usuario_que_no_existe_123');
    
    if (response.status === 404 && !response.data.success) {
      log('✅ Test 4 PASADO: Manejo correcto de usuario inexistente', 'green');
      passedTests++;
    } else {
      log('❌ Test 4 FALLIDO: No maneja correctamente usuarios inexistentes', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 4 FALLIDO: ${error.message}`, 'red');
    failedTests++;
  }
  
  // Test 5: Resolver nombre público a URL
  try {
    log('\nTest 5: Resolver nombre "alice_wallet" a URL...', 'blue');
    const response = await makeRequest('POST', '/api/resolve-user', { publicName: 'alice_wallet' });
    
    if (response.status === 200 && response.data.success && response.data.walletUrl) {
      log('✅ Test 5 PASADO: Nombre resuelto correctamente', 'green');
      log(`   URL: ${response.data.walletUrl}`, 'cyan');
      passedTests++;
    } else {
      log('❌ Test 5 FALLIDO: No se pudo resolver el nombre', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 5 FALLIDO: ${error.message}`, 'red');
    failedTests++;
  }
  
  // Test 6: Agregar wallet temporal (para probar)
  const testWalletName = `test_wallet_${Date.now()}`;
  const testWalletUrl = `https://ilp.interledger-test.dev/test-${Date.now()}`;
  let walletAdded = false;
  
  try {
    log(`\nTest 6: Agregar wallet temporal "${testWalletName}"...`, 'blue');
    const response = await makeRequest('POST', '/api/wallets-db/add', {
      publicName: testWalletName,
      walletUrl: testWalletUrl
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ Test 6 PASADO: Wallet agregada correctamente', 'green');
      walletAdded = true;
      passedTests++;
    } else {
      log('❌ Test 6 FALLIDO: No se pudo agregar la wallet', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`❌ Test 6 FALLIDO: ${error.message}`, 'red');
    failedTests++;
  }
  
  // Test 7: Eliminar wallet temporal (limpieza)
  if (walletAdded) {
    try {
      log(`\nTest 7: Eliminar wallet temporal "${testWalletName}"...`, 'blue');
      const response = await makeRequest('DELETE', `/api/wallets-db/delete/${testWalletName}`);
      
      if (response.status === 200 && response.data.success) {
        log('✅ Test 7 PASADO: Wallet eliminada correctamente', 'green');
        passedTests++;
      } else {
        log('❌ Test 7 FALLIDO: No se pudo eliminar la wallet', 'red');
        failedTests++;
      }
    } catch (error) {
      log(`❌ Test 7 FALLIDO: ${error.message}`, 'red');
      failedTests++;
    }
  }
  
  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('RESUMEN DE PRUEBAS', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`\n✅ Pruebas exitosas: ${passedTests}`, 'green');
  log(`❌ Pruebas fallidas: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  const total = passedTests + failedTests;
  const percentage = ((passedTests / total) * 100).toFixed(1);
  
  log(`\n📊 Porcentaje de éxito: ${percentage}%`, percentage >= 80 ? 'green' : 'yellow');
  
  if (failedTests === 0) {
    log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! La integración está funcionando correctamente.', 'green');
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
  }
  
  log('\n');
}

// Ejecutar tests
runTests().catch((error) => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  log('⚠️  Asegúrate de que el servidor esté corriendo (npm run server)\n', 'yellow');
  process.exit(1);
});

