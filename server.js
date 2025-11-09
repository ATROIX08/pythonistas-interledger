const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { createAuthenticatedClient } = require('@interledger/open-payments');
const { parseWalletAddress, poll, sleep } = require('./src/utils');
const Database = require('better-sqlite3');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// ===== FUNCIONES PARA TASAS DE MERCADO (FRANKFURTER API) =====
async function getMarketRates(baseCurrency = 'EUR') {
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error(`Error obteniendo tasas de mercado para ${baseCurrency}:`, error.message);
    return null;
  }
}

// Monedas soportadas por Frankfurter que tenemos en Open Payments
const MARKET_SUPPORTED_CURRENCIES = ['CAD', 'EUR', 'GBP', 'MXN', 'SGD', 'USD', 'ZAR'];
// PEN y PKR no están en Frankfurter

async function getAllMarketRates() {
  const allRates = {};
  
  for (const currency of MARKET_SUPPORTED_CURRENCIES) {
    const rates = await getMarketRates(currency);
    if (rates) {
      allRates[currency] = rates;
    }
    // Pequeño delay para no saturar la API
    await sleep(100);
  }
  
  return allRates;
}

function calculateArbitrageOpportunities(openPaymentsRates, marketRates) {
  const opportunities = [];
  
  for (const fromCurrency of MARKET_SUPPORTED_CURRENCIES) {
    const marketFromRates = marketRates[fromCurrency];
    const opFromRates = openPaymentsRates[fromCurrency];
    
    if (!marketFromRates || !opFromRates) continue;
    
    for (const toCurrency of MARKET_SUPPORTED_CURRENCIES) {
      if (fromCurrency === toCurrency) continue;
      
      const marketRate = marketFromRates[toCurrency];
      const opRate = opFromRates[toCurrency]?.rate;
      
      if (!marketRate || !opRate) continue;
      
      // Calcular diferencia: si OP da más que el mercado, hay arbitraje
      const spreadPct = ((opRate - marketRate) / marketRate) * 100;
      
      if (Math.abs(spreadPct) > 0.1) { // Más de 0.1% de diferencia
        opportunities.push({
          pair: `${fromCurrency}→${toCurrency}`,
          fromCurrency,
          toCurrency,
          openPaymentsRate: opRate,
          marketRate: marketRate,
          spreadPct: spreadPct,
          arbitrageType: spreadPct > 0 ? 'OP_MEJOR' : 'MERCADO_MEJOR',
          profitPotential: Math.abs(spreadPct)
        });
      }
    }
  }
  
  // Ordenar por mayor potencial de ganancia
  opportunities.sort((a, b) => b.profitPotential - a.profitPotential);
  
  return opportunities;
}

// Detectar todas las wallets configuradas en el .env
function getAvailableWallets() {
  const wallets = [];
  const envKeys = Object.keys(process.env);
  
  // Buscar patrones como WALLET_EUR_URL, WALLET_USD_URL, etc.
  const walletPrefixes = new Set();
  envKeys.forEach(key => {
    const match = key.match(/^WALLET_([A-Z]+)_URL$/);
    if (match) {
      walletPrefixes.add(match[1]);
    }
  });
  
  // Para cada prefijo encontrado, construir la configuración de la wallet
  walletPrefixes.forEach(prefix => {
    const walletConfig = {
      id: prefix,
      name: prefix,
      url: process.env[`WALLET_${prefix}_URL`],
      keyId: process.env[`WALLET_${prefix}_KEY_ID`],
      privateKeyPath: process.env[`WALLET_${prefix}_PRIVATE_KEY_PATH`],
      publicKeyPath: process.env[`WALLET_${prefix}_PUBLIC_KEY_PATH`]
    };
    
    // Solo agregar si tiene todos los campos necesarios
    if (walletConfig.url && walletConfig.keyId && walletConfig.privateKeyPath) {
      wallets.push(walletConfig);
    }
  });
  
  // Si no hay wallets con prefijo, usar las variables legacy
  if (wallets.length === 0 && process.env.WALLET_URL && process.env.KEY_ID) {
    wallets.push({
      id: 'DEFAULT',
      name: 'DEFAULT',
      url: process.env.WALLET_URL,
      keyId: process.env.KEY_ID,
      privateKeyPath: process.env.PRIVATE_KEY_PATH || './keys/private_python.key',
      publicKeyPath: process.env.PUBLIC_KEY_PATH || './keys/public_python.key'
    });
  }
  
  return wallets;
}

const AVAILABLE_WALLETS = getAvailableWallets();

console.log(`\n💼 Wallets detectadas: ${AVAILABLE_WALLETS.length}`);
AVAILABLE_WALLETS.forEach(w => console.log(`   - ${w.name}: ${w.url}`));

// ===== BASE DE DATOS PARA NOMBRES PÚBLICOS =====
const DB_PATH = path.join(__dirname, 'open-payments', 'wallets.db');

// Inicializar base de datos
function initializeDatabase() {
  try {
    const db = new Database(DB_PATH);
    
    // Crear tabla si no existe (con campo adicional para marcar si es dummy)
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_name TEXT NOT NULL,
        wallet_url TEXT NOT NULL,
        is_dummy INTEGER DEFAULT 0,
        owner TEXT
      )
    `);
    
    // Verificar si hay datos, si no, insertar datos iniciales
    const count = db.prepare('SELECT COUNT(*) as count FROM wallets').get();
    if (count.count === 0) {
      console.log('📋 Base de datos vacía, poblando con datos iniciales...');
      const insert = db.prepare('INSERT OR IGNORE INTO wallets (public_name, wallet_url, is_dummy, owner) VALUES (?, ?, ?, ?)');
      
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
      
      for (const [name, url, isDummy, owner] of initialData) {
        insert.run(name, url, isDummy, owner);
      }
      console.log('✅ Datos iniciales agregados a la base de datos');
      console.log('   - 5 wallets reales de Humberto');
      console.log('   - 3 wallets dummy de ejemplo');
    }
    
    db.close();
    console.log('✅ Base de datos de nombres públicos inicializada');
  } catch (error) {
    console.error('⚠️ Error inicializando base de datos:', error.message);
  }
}

// Función para obtener wallet URL por nombre público
function getWalletUrlFromDb(publicName) {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare('SELECT wallet_url FROM wallets WHERE public_name = ?').get(publicName);
    db.close();
    return row ? row.wallet_url : null;
  } catch (error) {
    console.error('Error leyendo base de datos:', error.message);
    return null;
  }
}

// Función para listar todas las wallets registradas
function listAllWalletsFromDb() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare('SELECT public_name, wallet_url, is_dummy, owner FROM wallets ORDER BY is_dummy ASC, public_name').all();
    db.close();
    return rows;
  } catch (error) {
    console.error('Error leyendo base de datos:', error.message);
    return [];
  }
}

// Función para obtener wallets de un owner específico
function getWalletsByOwner(owner) {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare('SELECT public_name, wallet_url FROM wallets WHERE owner = ? ORDER BY public_name').all(owner);
    db.close();
    return rows;
  } catch (error) {
    console.error('Error leyendo base de datos:', error.message);
    return [];
  }
}

// Función para agregar wallet
function addWalletToDb(publicName, walletUrl) {
  try {
    const db = new Database(DB_PATH);
    const stmt = db.prepare('INSERT INTO wallets (public_name, wallet_url) VALUES (?, ?)');
    stmt.run(publicName, walletUrl);
    db.close();
    return { success: true };
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return { success: false, error: 'El nombre público ya existe' };
    }
    return { success: false, error: error.message };
  }
}

// Función para eliminar wallet
function deleteWalletFromDb(publicName) {
  try {
    const db = new Database(DB_PATH);
    const result = db.prepare('DELETE FROM wallets WHERE public_name = ?').run(publicName);
    db.close();
    return { success: result.changes > 0, deleted: result.changes > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para actualizar wallet
function updateWalletInDb(publicName, newWalletUrl) {
  try {
    const db = new Database(DB_PATH);
    const result = db.prepare('UPDATE wallets SET wallet_url = ? WHERE public_name = ?').run(newWalletUrl, publicName);
    db.close();
    return { success: result.changes > 0, updated: result.changes > 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Inicializar base de datos al arrancar
initializeDatabase();

// Función para leer la clave privada de una wallet específica
function getPrivateKey(walletConfig = null) {
  const privateKeyPath = walletConfig 
    ? walletConfig.privateKeyPath 
    : (process.env.PRIVATE_KEY_PATH || './keys/private_python.key');
  return fs.readFileSync(privateKeyPath, 'utf8');
}

// Función para crear el cliente autenticado para una wallet específica
async function createClient(walletConfig = null) {
  const config = walletConfig || {
    url: process.env.WALLET_URL,
    keyId: process.env.KEY_ID,
    privateKeyPath: process.env.PRIVATE_KEY_PATH || './keys/private_python.key'
  };
  
  const walletAddressUrl = parseWalletAddress(config.url);
  const privateKey = getPrivateKey(config);
  const keyId = config.keyId;

  return await createAuthenticatedClient({
    walletAddressUrl,
    privateKey,
    keyId
  });
}

// Endpoint principal para enviar pagos
app.post('/api/send-payment', async (req, res) => {
  const { receivingWalletUrl, amount, description, senderWalletId } = req.body;

  if (!receivingWalletUrl || !amount) {
    return res.status(400).json({ 
      error: 'Se requiere la URL de destino y el monto' 
    });
  }

  try {
    console.log('\nIniciando proceso de pago...');
    console.log('Destinatario:', receivingWalletUrl);
    console.log('Monto:', amount);
    
    // Obtener configuración de la wallet emisora
    let senderWalletConfig = null;
    if (senderWalletId) {
      senderWalletConfig = AVAILABLE_WALLETS.find(w => w.id === senderWalletId);
      if (!senderWalletConfig) {
        return res.status(400).json({ error: `Wallet ${senderWalletId} no encontrada` });
      }
      console.log('Wallet emisora:', senderWalletConfig.name, '-', senderWalletConfig.url);
    }

    // Crear cliente
    const client = await createClient(senderWalletConfig);
    
    // Obtener las wallet addresses
    const sendingWalletUrl = senderWalletConfig ? senderWalletConfig.url : process.env.WALLET_URL;
    const sendingWalletAddressUrl = parseWalletAddress(sendingWalletUrl);
    const receivingWalletAddressUrl = parseWalletAddress(receivingWalletUrl);

    console.log('Obteniendo información de las wallets...');
    const [sendingWalletAddress, receivingWalletAddress] = await Promise.all([
      client.walletAddress.get({ url: sendingWalletAddressUrl }),
      client.walletAddress.get({ url: receivingWalletAddressUrl })
    ]);

    console.log('Wallet emisora:', sendingWalletAddress.id);
    console.log('Wallet receptora:', receivingWalletAddress.id);

    // Paso 1: Crear incoming payment público en la wallet receptora
    console.log('Paso 1: Creando incoming payment público...');
    
    // Obtener grant público para incoming payment (sin autenticación de usuario)
    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['create']
            }
          ]
        }
      }
    );

    // Crear incoming payment SIN monto específico (acepta cualquier cantidad)
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
      },
      {
        walletAddress: receivingWalletAddress.id,
        metadata: {
          description: description || 'Pago desde interfaz web'
        }
      }
    );

    console.log('Incoming payment creado:', incomingPayment.id);

    // Paso 2: Obtener quote grant
    console.log('Paso 2: Obteniendo grant para quote...');
    const quoteGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'quote',
              actions: ['read', 'create']
            }
          ]
        }
      }
    );

    const quoteToken = quoteGrant.access_token.value;

    // Paso 3: Crear quote con debitAmount (cuánto quieres gastar)
    console.log('Paso 3: Creando quote...');
    
    // Convertir el monto a la menor unidad usando el assetScale
    // Si el usuario ingresa 10 EUR y assetScale es 2, enviamos 1000 (10 * 10^2)
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    console.log(`Monto ingresado: ${amount} ${sendingWalletAddress.assetCode}`);
    console.log(`Monto en unidades base: ${amountInBaseUnits} (scale: ${sendingWalletAddress.assetScale})`);
    
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteToken
      },
      {
        receiver: incomingPayment.id,
        walletAddress: sendingWalletAddress.id,
        method: 'ilp',
        debitAmount: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale,
          value: amountInBaseUnits.toString()
        }
      }
    );

    console.log('Quote creado:', quote.id);
    console.log('Monto a debitar:', quote.debitAmount.value);
    console.log('Monto a recibir:', quote.receiveAmount.value);

    // Paso 4: Obtener outgoing payment grant
    console.log('Paso 4: Obteniendo grant para outgoing payment...');
    const pendingOutgoingPaymentGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'outgoing-payment',
              actions: ['read', 'create', 'list'],
              identifier: sendingWalletAddress.id,
              limits: {
                debitAmount: {
                  assetCode: sendingWalletAddress.assetCode,
                  assetScale: sendingWalletAddress.assetScale,
                  value: quote.debitAmount.value
                }
              }
            }
          ]
        },
        interact: {
          start: ['redirect']
        }
      }
    );

    const interactUrl = pendingOutgoingPaymentGrant.interact?.redirect;
    console.log('Grant pendiente obtenido, URL de interacción:', interactUrl);

    const continueUrl = pendingOutgoingPaymentGrant.continue.uri;
    const continueToken = pendingOutgoingPaymentGrant.continue.access_token.value;
    const pollingFrequencyMs = pendingOutgoingPaymentGrant.continue.wait * 1000;

    // Si hay URL de interacción, retornar inmediatamente para que el frontend pueda redirigir el popup
    let finalizedOutgoingPaymentGrant;
    
    if (interactUrl) {
      console.log('Paso 5: Se requiere aprobación del usuario');
      console.log('🔗 URL de aprobación:', interactUrl);
      
      // Retornar inmediatamente al frontend con el interactUrl
      // El frontend ya tiene un popup abierto y lo redirigirá a esta URL
      return res.status(202).json({
        status: 'pending_approval',
        message: 'Se requiere aprobación del usuario',
        interactUrl: interactUrl,
        // Incluir datos para continuar el pago después
        continueData: {
          continueUrl,
          continueToken,
          quote: {
            id: quote.id,
            debitAmount: quote.debitAmount,
            receiveAmount: quote.receiveAmount
          },
          incomingPaymentId: incomingPayment.id,
          sendingWalletUrl: sendingWalletAddress.id,
          receivingWalletUrl: receivingWalletAddress.id,
          senderWalletId: senderWalletConfig?.id || null  // NUEVO: guardar el ID de la wallet emisora
        }
      });
    } else {
      // No hay interacción requerida
      await sleep(pollingFrequencyMs);
      finalizedOutgoingPaymentGrant = await client.grant.continue({
        accessToken: continueToken,
        url: continueUrl
      });
    }

    const outgoingPaymentToken = finalizedOutgoingPaymentGrant.access_token.value;
    console.log('Grant aprobado');

    // Paso 6: Crear outgoing payment
    console.log('Paso 6: Creando outgoing payment...');
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: outgoingPaymentToken
      },
      {
        walletAddress: sendingWalletAddress.id,
        quoteId: quote.id,
        metadata: {
          description: description || 'Pago realizado desde la interfaz web'
        }
      }
    );

    console.log('Pago completado exitosamente!');
    console.log('Outgoing payment ID:', outgoingPayment.id);

    res.json({
      success: true,
      message: 'Pago enviado exitosamente',
      data: {
        outgoingPaymentId: outgoingPayment.id,
        incomingPaymentId: incomingPayment.id,
        quoteId: quote.id,
        receiver: receivingWalletAddress.id,
        sentTo: receivingWalletAddress.id,
        debitAmount: quote.debitAmount,
        receiveAmount: quote.receiveAmount,
        status: outgoingPayment.status
      }
    });

  } catch (error) {
    console.error('Error al procesar el pago:', error);
    res.status(500).json({
      error: 'Error al procesar el pago',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para completar el pago después de la aprobación
app.post('/api/complete-payment', async (req, res) => {
  const { continueData } = req.body;
  
  if (!continueData) {
    return res.status(400).json({ error: 'Faltan datos para continuar el pago' });
  }
  
  console.log('\nCompletando pago después de aprobación...');
  
  try {
    // Obtener configuración de la wallet emisora
    const { senderWalletId } = continueData;
    let senderWalletConfig = null;
    
    if (senderWalletId) {
      senderWalletConfig = AVAILABLE_WALLETS.find(w => w.id === senderWalletId);
      if (!senderWalletConfig) {
        return res.status(400).json({ error: `Wallet emisora no encontrada: ${senderWalletId}` });
      }
      console.log(`Usando wallet emisora: ${senderWalletConfig.name} (${senderWalletConfig.id})`);
    }
    
    const client = await createClient(senderWalletConfig);
    const { continueUrl, continueToken, quote, incomingPaymentId, sendingWalletUrl, receivingWalletUrl } = continueData;
    
    // Paso 5: Hacer polling del grant para verificar aprobación
    console.log('Paso 5: Verificando aprobación del grant...');
    
    const pollingFrequencyMs = 1000; // 1 segundo
    const maxAttempts = 60;
    let attempts = 0;
    let finalizedOutgoingPaymentGrant;
    
    while (attempts < maxAttempts) {
      await sleep(pollingFrequencyMs);
      attempts++;
      
      try {
        console.log(`Esperando aprobación... (intento ${attempts}/${maxAttempts})`);
        
        const continuedGrant = await client.grant.continue({
          accessToken: continueToken,
          url: continueUrl
        });
        
        if (continuedGrant?.access_token?.value) {
          finalizedOutgoingPaymentGrant = continuedGrant;
          console.log('✅ Grant aprobado');
          break;
        }
      } catch (error) {
        // Continuar esperando
        continue;
      }
    }
    
    if (!finalizedOutgoingPaymentGrant) {
      console.log('❌ Timeout esperando aprobación');
      return res.status(408).json({
        error: 'Timeout esperando aprobación',
        details: 'El pago no fue aprobado a tiempo.'
      });
    }

    const outgoingPaymentToken = finalizedOutgoingPaymentGrant.access_token.value;

    // Paso 6: Crear outgoing payment
    console.log('Paso 6: Creando outgoing payment...');
    
    const sendingWalletAddressUrl = parseWalletAddress(sendingWalletUrl);
    const sendingWalletAddress = await client.walletAddress.get({ url: sendingWalletAddressUrl });
    
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: outgoingPaymentToken
      },
      {
        walletAddress: sendingWalletUrl,
        quoteId: quote.id,
        metadata: {
          description: 'Pago realizado desde la interfaz web'
        }
      }
    );

    console.log('✅ Pago completado exitosamente!');
    console.log('Outgoing payment ID:', outgoingPayment.id);

    res.json({
      success: true,
      message: 'Pago enviado exitosamente',
      data: {
        outgoingPaymentId: outgoingPayment.id,
        incomingPaymentId: incomingPaymentId,
        quoteId: quote.id,
        receiver: receivingWalletUrl,
        sentTo: receivingWalletUrl,
        debitAmount: quote.debitAmount,
        receiveAmount: quote.receiveAmount,
        status: outgoingPayment.status
      }
    });

  } catch (error) {
    console.error('Error al completar el pago:', error);
    res.status(500).json({
      error: 'Error al completar el pago',
      details: error.description || error.message
    });
  }
});

// Endpoint para obtener matriz de optimización (todas las rutas posibles)
app.post('/api/optimization-matrix', async (req, res) => {
  const { receivingWalletUrls, amount, senderWalletId, objective } = req.body;
  
  if (!amount) {
    return res.status(400).json({ error: 'Se requiere el monto' });
  }
  
  // Objetivo de optimización (default: roundtrip)
  const optimizationObjective = objective || 'roundtrip';
  const epsilonBps = 5; // 5 basis points de tolerancia
  const epsilon = epsilonBps / 10000;
  
  // Wallets emisoras: filtrar por senderWalletId si se especifica, sino usar todas
  const senderWallets = senderWalletId 
    ? AVAILABLE_WALLETS.filter(w => w.id === senderWalletId)
    : AVAILABLE_WALLETS;
  
  // Wallets receptoras: URLs proporcionadas + TODAS las wallets propias (para arbitraje completo)
  let receivingWallets = [];
  
  // 1. Agregar URLs proporcionadas
  if (receivingWalletUrls && Array.isArray(receivingWalletUrls)) {
    receivingWallets = receivingWalletUrls
      .map(url => url.trim())
      .filter(url => url.length > 0);
  }
  
  // 2. Agregar TODAS las wallets propias (para arbitraje)
  AVAILABLE_WALLETS.forEach(wallet => {
    if (!receivingWallets.includes(wallet.url)) {
      receivingWallets.push(wallet.url);
    }
  });
  
  // Limitar a 15 destinos totales
  receivingWallets = receivingWallets.slice(0, 15);
  
  console.log(`\n📊 Generando matriz de tipos de cambio cruzados (${senderWallets.length}×${receivingWallets.length})...`);
  console.log(`Monto base: ${amount}`);
  console.log(`Total de rutas a evaluar: ${senderWallets.length * receivingWallets.length}`);
  
  console.log(`Objetivo de optimización: ${optimizationObjective}`);
  console.log(`Tolerancia: ${epsilonBps} bps`);
  
  try {
    const matrix = [];
    let bestRoute = null;
    let bestScore = -Infinity;
    
    // Estructura para almacenar tasas por activo (para detección de arbitraje y ROI)
    const assetRates = {}; // { [assetFrom]: { [assetTo]: { rate, costPerDestUnit, path, timestamp } } }
    
    function setRate(from, to, rate, costPerDestUnit, path) {
      if (!assetRates[from]) assetRates[from] = {};
      // Guardar la mejor tasa i->j observada (maximiza rate)
      if (!assetRates[from][to] || rate > assetRates[from][to].rate) {
        assetRates[from][to] = { 
          rate, 
          costPerDestUnit,
          path,
          timestamp: Date.now()
        };
      }
    }
    
    function getReverseRate(from, to) {
      // Busca la mejor tasa de regreso to->from
      return assetRates[to]?.[from]?.rate || null;
    }
    
    // Para cada cuenta emisora
    for (const senderWallet of senderWallets) {
      const senderRow = {
        senderId: senderWallet.id,
        senderName: senderWallet.name,
        senderAsset: null,
        routes: []
      };
      
      try {
        const client = await createClient(senderWallet);
        const senderWalletAddressUrl = parseWalletAddress(senderWallet.url);
        const senderWalletAddress = await client.walletAddress.get({ url: senderWalletAddressUrl });
        
        senderRow.senderAsset = senderWalletAddress.assetCode;
        senderRow.senderScale = senderWalletAddress.assetScale;
        
        const originalAmount = parseFloat(amount);
        const amountInBaseUnits = Math.round(originalAmount * Math.pow(10, senderWalletAddress.assetScale));
        
                // Para cada wallet destino
                for (const receivingWalletUrl of receivingWallets) {
                  try {
                    const receivingWalletAddressUrl = parseWalletAddress(receivingWalletUrl);
                    const receivingWalletAddress = await client.walletAddress.get({ url: receivingWalletAddressUrl });
                    
                    // Si es la misma wallet (misma URL), mostrar diagonal (tasa 1:1)
                    if (receivingWalletUrl === senderWallet.url) {
                      const asset = senderWalletAddress.assetCode;
                      senderRow.routes.push({
                        receiverUrl: receivingWalletUrl,
                        receiverShort: receivingWalletUrl.split('/').pop(),
                        receiverAsset: asset,
                        success: true,
                        isDiagonal: true,
                        rate: 1.0,
                        inverseRate: 1.0,
                        receiveValue: originalAmount,
                        debitValue: originalAmount,
                        sameCurrency: true,
                        senderAsset: asset
                      });
                      
                      // Registrar tasa 1:1 para misma wallet
                      setRate(asset, asset, 1.0, { 
                        senderId: senderWallet.id, 
                        receiverUrl: receivingWalletUrl 
                      });
                      continue;
                    }
            
            // Crear incoming payment
            const incomingPaymentGrant = await client.grant.request(
              { url: receivingWalletAddress.authServer },
              {
                access_token: {
                  access: [{ type: 'incoming-payment', actions: ['create'] }]
                }
              }
            );
            
            const incomingPayment = await client.incomingPayment.create(
              {
                url: receivingWalletAddress.resourceServer,
                accessToken: incomingPaymentGrant.access_token.value
              },
              {
                walletAddress: receivingWalletAddress.id,
                metadata: { description: 'Matriz de optimización' }
              }
            );
            
            // Obtener quote grant
            const quoteGrant = await client.grant.request(
              { url: senderWalletAddress.authServer },
              {
                access_token: {
                  access: [{ type: 'quote', actions: ['read', 'create'] }]
                }
              }
            );
            
            // Crear quote
            const quote = await client.quote.create(
              {
                url: senderWalletAddress.resourceServer,
                accessToken: quoteGrant.access_token.value
              },
              {
                receiver: incomingPayment.id,
                walletAddress: senderWalletAddress.id,
                method: 'ilp',
                debitAmount: {
                  assetCode: senderWalletAddress.assetCode,
                  assetScale: senderWalletAddress.assetScale,
                  value: amountInBaseUnits.toString()
                }
              }
            );
            
            // ===== CALCULAR MÉTRICAS CORRECTAMENTE =====
            // Valores en unidades humanas
            const debitValue = Number(quote.debitAmount.value) / (10 ** quote.debitAmount.assetScale);
            const receiveValue = Number(quote.receiveAmount.value) / (10 ** quote.receiveAmount.assetScale);
            
            const senderAsset = quote.debitAmount.assetCode;
            const receiverAsset = quote.receiveAmount.assetCode;
            const sameCurrency = senderAsset === receiverAsset;
            
            // Métricas fundamentales
            const rate = receiveValue / debitValue;  // R_ij: destino por 1 de origen
            const costPerDestUnit = debitValue / receiveValue; // Cuánto origen cuesta 1 destino
            const inverseRate = 1 / rate; // R_ji implícita (solo para mostrar)
            
            const route = {
              receiverUrl: receivingWalletUrl,
              receiverShort: receivingWalletUrl.split('/').pop(),
              receiverAsset: receiverAsset,
              senderAsset: senderAsset,
              debitValue: debitValue,
              receiveValue: receiveValue,
              rate: rate,                       // Tasa efectiva
              costPerDestUnit: costPerDestUnit, // Costo por unidad destino
              inverseRate: inverseRate,
              sameCurrency: sameCurrency,
              success: true,
              // ROI será calculado en segunda pasada
              hasRoundTrip: false,
              roundTripProduct: null,
              roiToSenderPct: null
            };
            
            // Registrar tasa para detección de arbitraje y ROI
            setRate(senderAsset, receiverAsset, rate, costPerDestUnit, {
              senderId: senderWallet.id,
              senderName: senderWallet.name,
              receiverUrl: receivingWalletUrl,
              receiverShort: receivingWalletUrl.split('/').pop()
            });
            
            senderRow.routes.push(route);
            console.log(`✓ ${senderWallet.name} → ${receivingWalletUrl.split('/').pop()}: ${rate.toFixed(4)} ${receiverAsset}/${senderAsset}`);
            
          } catch (error) {
            console.error(`✗ ${senderWallet.name} → ${receivingWalletUrl.split('/').pop()}: ${error.message}`);
            senderRow.routes.push({
              receiverUrl: receivingWalletUrl,
              receiverShort: receivingWalletUrl.split('/').pop(),
              success: false,
              error: error.message
            });
          }
        }
      } catch (error) {
        console.error(`✗ Error con cuenta emisora ${senderWallet.name}:`, error.message);
        senderRow.error = error.message;
      }
      
      matrix.push(senderRow);
    }
    
    // ===== SEGUNDA PASADA: CALCULAR ROI IDA-Y-VUELTA =====
    console.log(`\n🔄 Calculando ROI ida-y-vuelta para cada celda...`);
    
    for (const row of matrix) {
      for (const route of row.routes) {
        if (!route.success || route.isDiagonal) continue;
        
        const { senderAsset, receiverAsset } = route;
        const reverseRate = getReverseRate(senderAsset, receiverAsset);
        
        if (reverseRate) {
          // Existe una ruta de regreso
          const roundTripProduct = route.rate * reverseRate; // i→j→i
          const roiToSenderPct = (roundTripProduct - 1) * 100;
          
          route.hasRoundTrip = true;
          route.roundTripProduct = roundTripProduct;
          route.roiToSenderPct = roiToSenderPct;
          
          if (roiToSenderPct > epsilon * 100) {
            console.log(`  ✓ ${senderAsset}→${receiverAsset}→${senderAsset}: ROI +${roiToSenderPct.toFixed(3)}%`);
          }
        }
      }
    }
    
    // ===== SELECCIONAR MEJOR RUTA SEGÚN OBJETIVO =====
    console.log(`\n🎯 Seleccionando mejor ruta según objetivo: ${optimizationObjective}`);
    
    for (const row of matrix) {
      for (const route of row.routes) {
        if (!route.success || route.isDiagonal || route.sameCurrency) continue;
        
        let score = 0;
        
        switch (optimizationObjective) {
          case 'roundtrip':
            // Maximizar ROI ida-y-vuelta (si existe)
            if (route.hasRoundTrip) {
              score = route.roiToSenderPct;
            } else {
              score = -Infinity; // Sin regreso, no óptimo para roundtrip
            }
            break;
          
          case 'max_rate':
            // Maximizar rate (más destino por 1 origen)
            score = route.rate;
            break;
          
          case 'min_cost':
            // Minimizar costPerDestUnit (menos origen por 1 destino)
            score = -route.costPerDestUnit; // Negativo para que menor costo = mayor score
            break;
          
          default:
            score = route.rate; // Fallback
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestRoute = {
            ...route,
            senderId: row.senderId,
            senderName: row.senderName,
            score: score,
            objective: optimizationObjective
          };
        }
      }
    }
    
    // ===== DETECCIÓN DE ARBITRAJE TRIANGULAR =====
    function findTriangularArbitrage(assetRates, epsilon = 0.0005) { // 5 bps de tolerancia
      const assets = Object.keys(assetRates);
      const opportunities = [];
      
      for (let i = 0; i < assets.length; i++) {
        for (let j = 0; j < assets.length; j++) {
          for (let k = 0; k < assets.length; k++) {
            const a = assets[i], b = assets[j], c = assets[k];
            // Necesitamos 3 divisas diferentes
            if (new Set([a, b, c]).size < 3) continue;
            
            const R_ab = assetRates[a]?.[b]?.rate;
            const R_bc = assetRates[b]?.[c]?.rate;
            const R_ca = assetRates[c]?.[a]?.rate;
            
            if (!R_ab || !R_bc || !R_ca) continue;
            
            // Producto de tasas: por cada 1 unidad de 'a', cuántas unidades de 'a' obtengo al final
            const product = R_ab * R_bc * R_ca;
            
            if (product > 1 + epsilon) {
              opportunities.push({
                cycle: [a, b, c, a],
                product: product,
                gainPct: (product - 1) * 100,
                legs: {
                  [`${a}→${b}`]: { rate: R_ab, path: assetRates[a][b].path },
                  [`${b}→${c}`]: { rate: R_bc, path: assetRates[b][c].path },
                  [`${c}→${a}`]: { rate: R_ca, path: assetRates[c][a].path }
                },
                description: `${a} → ${b} → ${c} → ${a}`,
                profit: `+${((product - 1) * 100).toFixed(3)}%`
              });
            }
          }
        }
      }
      
      // Ordenar por mayor ganancia
      opportunities.sort((x, y) => y.product - x.product);
      return opportunities;
    }
    
    const arbitrageOpportunities = findTriangularArbitrage(assetRates, epsilon);
    
    // ===== COMPARAR CON TASAS DE MERCADO =====
    console.log(`\n💱 Obteniendo tasas de mercado (Frankfurter API)...`);
    const marketRates = await getAllMarketRates();
    const marketArbitrageOpportunities = calculateArbitrageOpportunities(assetRates, marketRates);
    
    console.log(`\n📊 ANÁLISIS DE ARBITRAJE vs MERCADO:`);
    if (marketArbitrageOpportunities.length > 0) {
      console.log(`   Encontradas ${marketArbitrageOpportunities.length} oportunidades de arbitraje vs mercado`);
      marketArbitrageOpportunities.slice(0, 5).forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${opp.pair}: ${opp.arbitrageType} | Spread: ${opp.spreadPct > 0 ? '+' : ''}${opp.spreadPct.toFixed(3)}%`);
      });
    } else {
      console.log(`   No se detectaron diferencias significativas con el mercado`);
    }
    
    // Log de mejor ruta
    if (bestRoute) {
      console.log(`\n⭐ MEJOR RUTA (${optimizationObjective.toUpperCase()}): ${bestRoute.senderName} (${bestRoute.senderAsset}) → ${bestRoute.receiverShort} (${bestRoute.receiverAsset})`);
      
      switch (optimizationObjective) {
        case 'roundtrip':
          console.log(`   ROI ida-y-vuelta: ${bestRoute.roiToSenderPct.toFixed(3)}%`);
          console.log(`   Producto: ${bestRoute.roundTripProduct.toFixed(6)}`);
          break;
        case 'max_rate':
          console.log(`   Tasa: ${bestRoute.rate.toFixed(4)} ${bestRoute.receiverAsset}/${bestRoute.senderAsset}`);
          break;
        case 'min_cost':
          console.log(`   Costo por unidad destino: ${bestRoute.costPerDestUnit.toFixed(4)} ${bestRoute.senderAsset}/${bestRoute.receiverAsset}`);
          break;
      }
      
      console.log(`   Tasa forward: ${bestRoute.rate.toFixed(4)} | Costo/dest: ${bestRoute.costPerDestUnit.toFixed(4)}`);
      if (bestRoute.hasRoundTrip) {
        console.log(`   ✓ Tiene regreso disponible (ROI: ${bestRoute.roiToSenderPct.toFixed(3)}%)`);
      }
    }
    
    if (arbitrageOpportunities.length > 0) {
      console.log(`\n🔄 ARBITRAJE TRIANGULAR DETECTADO: ${arbitrageOpportunities.length} oportunidades`);
      arbitrageOpportunities.slice(0, 3).forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${opp.description} | Ganancia: ${opp.profit}`);
      });
    } else {
      console.log(`\n🔄 No se detectaron oportunidades de arbitraje triangular`);
    }
    
    res.json({
      success: true,
      matrix: matrix,
      bestRoute: bestRoute,
      assetRates: assetRates,
      arbitrage: {
        count: arbitrageOpportunities.length,
        opportunities: arbitrageOpportunities.slice(0, 10),
        top: arbitrageOpportunities[0] || null
      },
      marketComparison: {
        marketRates: marketRates,
        arbitrageOpportunities: marketArbitrageOpportunities.slice(0, 20),
        count: marketArbitrageOpportunities.length,
        top: marketArbitrageOpportunities[0] || null,
        supportedCurrencies: MARKET_SUPPORTED_CURRENCIES
      },
      config: {
        objective: optimizationObjective,
        epsilonBps: epsilonBps,
        epsilon: epsilon
      },
      summary: {
        totalRoutes: senderWallets.length * receivingWallets.length,
        senderWallets: senderWallets.length,
        receiverWallets: receivingWallets.length,
        amount: parseFloat(amount)
      }
    });
    
  } catch (error) {
    console.error('Error generando matriz:', error);
    res.status(500).json({
      error: 'Error al generar matriz de optimización',
      details: error.description || error.message
    });
  }
});

// Endpoint para obtener cotizaciones de múltiples wallets (desde una cuenta específica)
app.post('/api/quote-preview-multiple', async (req, res) => {
  const { receivingWalletUrls, amount, senderWalletId } = req.body;
  
  if (!receivingWalletUrls || !Array.isArray(receivingWalletUrls) || receivingWalletUrls.length === 0 || !amount) {
    return res.status(400).json({ error: 'Se requieren URLs de destino y el monto' });
  }
  
  // Limitar a 5 wallets
  const wallets = receivingWalletUrls.slice(0, 5);
  
  console.log(`\nObteniendo cotizaciones para ${wallets.length} wallets...`);
  console.log('Monto:', amount);
  
  try {
    // Obtener configuración de la wallet emisora
    let senderWalletConfig = null;
    if (senderWalletId) {
      senderWalletConfig = AVAILABLE_WALLETS.find(w => w.id === senderWalletId);
      if (!senderWalletConfig) {
        return res.status(400).json({ error: `Wallet ${senderWalletId} no encontrada` });
      }
      console.log('Wallet emisora:', senderWalletConfig.name);
    }
    
    const client = await createClient(senderWalletConfig);
    
    // Obtener wallet emisora
    const sendingWalletUrl = senderWalletConfig ? senderWalletConfig.url : process.env.WALLET_URL;
    const sendingWalletAddressUrl = parseWalletAddress(sendingWalletUrl);
    const sendingWalletAddress = await client.walletAddress.get({ url: sendingWalletAddressUrl });
    
    // Convertir el monto a la menor unidad
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    
    // Obtener cotizaciones para cada wallet en paralelo
    const quotePromises = wallets.map(async (walletUrl) => {
      try {
        console.log(`Obteniendo cotización para: ${walletUrl}`);
        
        const receivingWalletAddressUrl = parseWalletAddress(walletUrl);
        const receivingWalletAddress = await client.walletAddress.get({ url: receivingWalletAddressUrl });
        
        // Crear incoming payment temporal
        const incomingPaymentGrant = await client.grant.request(
          { url: receivingWalletAddress.authServer },
          {
            access_token: {
              access: [
                {
                  type: 'incoming-payment',
                  actions: ['create']
                }
              ]
            }
          }
        );
        
        const incomingPayment = await client.incomingPayment.create(
          {
            url: receivingWalletAddress.resourceServer,
            accessToken: incomingPaymentGrant.access_token.value
          },
          {
            walletAddress: receivingWalletAddress.id,
            metadata: {
              description: 'Cotización preliminar (comparación)'
            }
          }
        );
        
        // Obtener quote grant
        const quoteGrant = await client.grant.request(
          { url: sendingWalletAddress.authServer },
          {
            access_token: {
              access: [
                {
                  type: 'quote',
                  actions: ['read', 'create']
                }
              ]
            }
          }
        );
        
        // Crear quote
        const quote = await client.quote.create(
          {
            url: sendingWalletAddress.resourceServer,
            accessToken: quoteGrant.access_token.value
          },
          {
            receiver: incomingPayment.id,
            walletAddress: sendingWalletAddress.id,
            method: 'ilp',
            debitAmount: {
              assetCode: sendingWalletAddress.assetCode,
              assetScale: sendingWalletAddress.assetScale,
              value: amountInBaseUnits.toString()
            }
          }
        );
        
        // ===== CALCULAR MÉTRICAS CORRECTAMENTE =====
        // Valores en unidades humanas
        const debitValue = Number(quote.debitAmount.value) / (10 ** quote.debitAmount.assetScale);
        const receiveValue = Number(quote.receiveAmount.value) / (10 ** quote.receiveAmount.assetScale);
        const originalAmount = parseFloat(amount);
        
        // Tasa efectiva i->j: cuántas unidades de destino por 1 unidad de origen
        const rate = receiveValue / debitValue;  // R_ij
        const inverseRate = 1 / rate;            // R_ji implícita
        
        const senderAsset = quote.debitAmount.assetCode;
        const receiverAsset = quote.receiveAmount.assetCode;
        const sameCurrency = senderAsset === receiverAsset;
        
        // Fee implícito: la diferencia entre lo pedido y lo que se debita
        // (normalmente ~0 porque fijamos debitAmount)
        const implicitFee = debitValue - originalAmount;
        const implicitFeePct = (implicitFee / originalAmount) * 100;
        
        console.log(`✓ Cotización para ${walletUrl}:`);
        console.log(`  - Solicitado: ${originalAmount.toFixed(2)} ${senderAsset}`);
        console.log(`  - Se debitará: ${debitValue.toFixed(2)} ${senderAsset}`);
        console.log(`  - Recibirá: ${receiveValue.toFixed(2)} ${receiverAsset}`);
        console.log(`  - Tasa efectiva: ${rate.toFixed(4)} ${receiverAsset}/${senderAsset}`);
        if (!sameCurrency) {
          console.log(`  - Tasa inversa: ${inverseRate.toFixed(4)} ${senderAsset}/${receiverAsset}`);
        }
        
        return {
          success: true,
          walletUrl: walletUrl,
          quote: {
            debitAmount: {
              value: debitValue,
              valueInBaseUnits: quote.debitAmount.value,
              assetCode: senderAsset,
              assetScale: quote.debitAmount.assetScale
            },
            receiveAmount: {
              value: receiveValue,
              valueInBaseUnits: quote.receiveAmount.value,
              assetCode: receiverAsset,
              assetScale: quote.receiveAmount.assetScale
            },
            rate: rate,                       // Tasa efectiva destino/origen
            inverseRate: inverseRate,         // Tasa inversa origen/destino
            implicitFee: implicitFee,         // Fee implícito (normalmente ~0)
            implicitFeePct: implicitFeePct,   // Porcentaje de fee implícito
            sameCurrency: sameCurrency        // Si es misma divisa o no
          }
        };
        
      } catch (error) {
        console.error(`✗ Error obteniendo cotización para ${walletUrl}:`, error.message);
        return {
          success: false,
          walletUrl: walletUrl,
          error: error.description || error.message || 'Error desconocido'
        };
      }
    });
    
    // Esperar todas las cotizaciones
    const quotes = await Promise.all(quotePromises);
    
    // ===== COMPARAR CON TASAS DE MERCADO =====
    console.log(`\n💱 Obteniendo tasas de mercado para comparación...`);
    let marketComparison = null;
    
    try {
      // Obtener moneda del sender
      const senderAsset = sendingWalletAddress.assetCode;
      
      if (MARKET_SUPPORTED_CURRENCIES.includes(senderAsset)) {
        const marketRates = await getMarketRates(senderAsset);
        
        if (marketRates) {
          const marketOpportunities = [];
          
          for (const quote of quotes) {
            if (!quote.success) continue;
            
            const receiverAsset = quote.quote.receiveAmount.assetCode;
            const opRate = quote.quote.rate;
            const marketRate = marketRates[receiverAsset];
            
            if (marketRate && MARKET_SUPPORTED_CURRENCIES.includes(receiverAsset)) {
              const spreadPct = ((opRate - marketRate) / marketRate) * 100;
              
              if (Math.abs(spreadPct) > 0.01) { // Más de 0.01% de diferencia
                marketOpportunities.push({
                  walletUrl: quote.walletUrl,
                  pair: `${senderAsset}→${receiverAsset}`,
                  openPaymentsRate: opRate,
                  marketRate: marketRate,
                  spreadPct: spreadPct,
                  arbitrageType: spreadPct > 0 ? 'OP_MEJOR' : 'MERCADO_MEJOR',
                  profitPotential: Math.abs(spreadPct)
                });
                
                console.log(`  ${quote.walletUrl.split('/').pop()}: OP=${opRate.toFixed(4)} vs Mercado=${marketRate.toFixed(4)} | ${spreadPct > 0 ? '✅' : '❌'} ${spreadPct > 0 ? '+' : ''}${spreadPct.toFixed(3)}%`);
              }
            }
          }
          
          marketOpportunities.sort((a, b) => b.profitPotential - a.profitPotential);
          
          marketComparison = {
            baseCurrency: senderAsset,
            marketRates: marketRates,
            opportunities: marketOpportunities,
            count: marketOpportunities.length,
            top: marketOpportunities[0] || null
          };
          
          console.log(`✓ ${marketOpportunities.length} diferencias detectadas vs mercado`);
        }
      } else {
        console.log(`⚠️ ${senderAsset} no soportado por Frankfurter API`);
      }
    } catch (error) {
      console.error('Error obteniendo tasas de mercado:', error.message);
    }
    
    res.json({
      success: true,
      quotes: quotes,
      marketComparison: marketComparison
    });
    
  } catch (error) {
    console.error('Error al obtener cotizaciones múltiples:', error);
    res.status(500).json({
      error: 'Error al obtener cotizaciones',
      details: error.description || error.message
    });
  }
});

// Endpoint para obtener una cotización preliminar (preview) - Legacy
app.post('/api/quote-preview', async (req, res) => {
  const { receivingWalletUrl, amount } = req.body;
  
  if (!receivingWalletUrl || !amount) {
    return res.status(400).json({ error: 'Se requiere la URL de destino y el monto' });
  }
  
  try {
    console.log('\nObteniendo cotización preliminar...');
    console.log('Destinatario:', receivingWalletUrl);
    console.log('Monto:', amount);
    
    const client = await createClient();
    
    // Obtener las wallet addresses
    const sendingWalletAddressUrl = parseWalletAddress(process.env.WALLET_URL);
    const receivingWalletAddressUrl = parseWalletAddress(receivingWalletUrl);
    
    const [sendingWalletAddress, receivingWalletAddress] = await Promise.all([
      client.walletAddress.get({ url: sendingWalletAddressUrl }),
      client.walletAddress.get({ url: receivingWalletAddressUrl })
    ]);
    
    // Crear incoming payment temporal
    const incomingPaymentGrant = await client.grant.request(
      { url: receivingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['create']
            }
          ]
        }
      }
    );
    
    const incomingPayment = await client.incomingPayment.create(
      {
        url: receivingWalletAddress.resourceServer,
        accessToken: incomingPaymentGrant.access_token.value
      },
      {
        walletAddress: receivingWalletAddress.id,
        metadata: {
          description: 'Cotización preliminar'
        }
      }
    );
    
    // Obtener quote grant
    const quoteGrant = await client.grant.request(
      { url: sendingWalletAddress.authServer },
      {
        access_token: {
          access: [
            {
              type: 'quote',
              actions: ['read', 'create']
            }
          ]
        }
      }
    );
    
    // Convertir el monto a la menor unidad usando el assetScale
    const amountInBaseUnits = Math.round(parseFloat(amount) * Math.pow(10, sendingWalletAddress.assetScale));
    
    // Crear quote
    const quote = await client.quote.create(
      {
        url: sendingWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
      },
      {
        receiver: incomingPayment.id,
        walletAddress: sendingWalletAddress.id,
        method: 'ilp',
        debitAmount: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale,
          value: amountInBaseUnits.toString()
        }
      }
    );
    
    console.log('Cotización obtenida:', quote.id);
    
    // Calcular el tipo de cambio
    const debitValue = parseFloat(quote.debitAmount.value) / Math.pow(10, quote.debitAmount.assetScale);
    const receiveValue = parseFloat(quote.receiveAmount.value) / Math.pow(10, quote.receiveAmount.assetScale);
    const exchangeRate = receiveValue / debitValue;
    
    res.json({
      success: true,
      quote: {
        debitAmount: {
          value: debitValue,
          valueInBaseUnits: quote.debitAmount.value,
          assetCode: quote.debitAmount.assetCode,
          assetScale: quote.debitAmount.assetScale
        },
        receiveAmount: {
          value: receiveValue,
          valueInBaseUnits: quote.receiveAmount.value,
          assetCode: quote.receiveAmount.assetCode,
          assetScale: quote.receiveAmount.assetScale
        },
        exchangeRate: exchangeRate,
        sendingWallet: {
          assetCode: sendingWalletAddress.assetCode,
          assetScale: sendingWalletAddress.assetScale
        },
        receivingWallet: {
          assetCode: receivingWalletAddress.assetCode,
          assetScale: receivingWalletAddress.assetScale
        }
      }
    });
    
  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({
      error: 'Error al obtener cotización',
      details: error.description || error.message
    });
  }
});

// Endpoint para listar todas las wallets disponibles
app.get('/api/wallets', async (req, res) => {
  try {
    const walletsInfo = [];
    
    for (const walletConfig of AVAILABLE_WALLETS) {
      try {
        const client = await createClient(walletConfig);
        const walletAddressUrl = parseWalletAddress(walletConfig.url);
        const walletAddress = await client.walletAddress.get({ url: walletAddressUrl });
        
        walletsInfo.push({
          id: walletConfig.id,
          name: walletConfig.name,
          url: walletAddress.id,
          assetCode: walletAddress.assetCode,
          assetScale: walletAddress.assetScale,
          authServer: walletAddress.authServer,
          resourceServer: walletAddress.resourceServer
        });
      } catch (error) {
        console.error(`Error obteniendo info de wallet ${walletConfig.name}:`, error.message);
        walletsInfo.push({
          id: walletConfig.id,
          name: walletConfig.name,
          url: walletConfig.url,
          error: error.message,
          available: false
        });
      }
    }
    
    res.json({
      success: true,
      wallets: walletsInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar el estado del servidor (legacy - mantener compatibilidad)
app.get('/api/status', async (req, res) => {
  try {
    const client = await createClient();
    const walletAddressUrl = parseWalletAddress(process.env.WALLET_URL || AVAILABLE_WALLETS[0]?.url);
    const walletAddress = await client.walletAddress.get({ url: walletAddressUrl });
    
    res.json({
      status: 'ok',
      wallet: {
        id: walletAddress.id,
        assetCode: walletAddress.assetCode,
        assetScale: walletAddress.assetScale
      },
      availableWallets: AVAILABLE_WALLETS.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// ===== ENDPOINTS PARA GESTIÓN DE NOMBRES PÚBLICOS =====

// Listar todas las wallets registradas en la base de datos
app.get('/api/wallets-db', (req, res) => {
  try {
    const wallets = listAllWalletsFromDb();
    res.json({
      success: true,
      wallets: wallets,
      count: wallets.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener información de una wallet por nombre público
app.get('/api/user/:publicName', async (req, res) => {
  const { publicName } = req.params;
  
  try {
    const walletUrl = getWalletUrlFromDb(publicName);
    
    if (!walletUrl) {
      return res.status(404).json({
        success: false,
        error: `No se encontró wallet para el usuario '${publicName}'`
      });
    }
    
    // Obtener información adicional de la wallet usando Open Payments
    try {
      const client = await createClient();
      const walletAddressUrl = parseWalletAddress(walletUrl);
      const walletAddress = await client.walletAddress.get({ url: walletAddressUrl });
      
      res.json({
        success: true,
        data: {
          publicName: publicName,
          walletUrl: walletUrl,
          walletInfo: {
            id: walletAddress.id,
            assetCode: walletAddress.assetCode,
            assetScale: walletAddress.assetScale,
            authServer: walletAddress.authServer,
            resourceServer: walletAddress.resourceServer
          }
        }
      });
    } catch (error) {
      // Si falla obtener la info de Open Payments, devolver solo la URL
      res.json({
        success: true,
        data: {
          publicName: publicName,
          walletUrl: walletUrl,
          walletInfo: null,
          warning: 'No se pudo obtener información adicional de la wallet'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Agregar una nueva wallet a la base de datos
app.post('/api/wallets-db/add', (req, res) => {
  const { publicName, walletUrl } = req.body;
  
  if (!publicName || !walletUrl) {
    return res.status(400).json({
      success: false,
      error: 'Se requieren los campos publicName y walletUrl'
    });
  }
  
  // Validar formato de URL
  try {
    new URL(walletUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'La URL de wallet no es válida'
    });
  }
  
  const result = addWalletToDb(publicName, walletUrl);
  
  if (result.success) {
    res.json({
      success: true,
      message: `Wallet '${publicName}' agregada exitosamente`
    });
  } else {
    res.status(400).json(result);
  }
});

// Eliminar una wallet de la base de datos
app.delete('/api/wallets-db/delete/:publicName', (req, res) => {
  const { publicName } = req.params;
  
  const result = deleteWalletFromDb(publicName);
  
  if (result.success && result.deleted) {
    res.json({
      success: true,
      message: `Wallet '${publicName}' eliminada exitosamente`
    });
  } else if (result.success && !result.deleted) {
    res.status(404).json({
      success: false,
      error: `No se encontró wallet con el nombre '${publicName}'`
    });
  } else {
    res.status(500).json(result);
  }
});

// Actualizar una wallet en la base de datos
app.put('/api/wallets-db/update', (req, res) => {
  const { publicName, walletUrl } = req.body;
  
  if (!publicName || !walletUrl) {
    return res.status(400).json({
      success: false,
      error: 'Se requieren los campos publicName y walletUrl'
    });
  }
  
  // Validar formato de URL
  try {
    new URL(walletUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'La URL de wallet no es válida'
    });
  }
  
  const result = updateWalletInDb(publicName, walletUrl);
  
  if (result.success && result.updated) {
    res.json({
      success: true,
      message: `Wallet '${publicName}' actualizada exitosamente`
    });
  } else if (result.success && !result.updated) {
    res.status(404).json({
      success: false,
      error: `No se encontró wallet con el nombre '${publicName}'`
    });
  } else {
    res.status(500).json(result);
  }
});

// Buscar wallet URL por nombre público (endpoint simplificado)
app.post('/api/resolve-user', (req, res) => {
  const { publicName } = req.body;
  
  if (!publicName) {
    return res.status(400).json({
      success: false,
      error: 'Se requiere el campo publicName'
    });
  }
  
  const walletUrl = getWalletUrlFromDb(publicName);
  
  if (walletUrl) {
    res.json({
      success: true,
      publicName: publicName,
      walletUrl: walletUrl
    });
  } else {
    res.status(404).json({
      success: false,
      error: `No se encontró wallet para el usuario '${publicName}'`
    });
  }
});

// Obtener todas las wallets asociadas a un owner
app.get('/api/wallets-by-owner/:owner', (req, res) => {
  const { owner } = req.params;
  
  try {
    const wallets = getWalletsByOwner(owner);
    
    if (wallets.length > 0) {
      res.json({
        success: true,
        owner: owner,
        wallets: wallets,
        count: wallets.length
      });
    } else {
      res.status(404).json({
        success: false,
        error: `No se encontraron wallets para el owner '${owner}'`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor iniciado en http://localhost:${PORT}`);
  console.log(`📊 Wallet URL: ${process.env.WALLET_URL}`);
  console.log(`🔑 Key ID: ${process.env.KEY_ID}`);
  console.log(`\n✨ Abre http://localhost:${PORT} en tu navegador para comenzar\n`);
});

