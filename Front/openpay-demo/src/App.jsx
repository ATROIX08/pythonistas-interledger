import React, { useState } from 'react';
import './App.css';

// URL del backend - ajusta el puerto si es necesario
const API_BASE_URL = 'http://localhost:5000';

export default function App() {
  const [usuario, setUsuario] = useState('AnaRaquel');
  const [saldo, setSaldo] = useState(12480.25);
  // Estado para controlar el valor del input de Monto
  const [monto, setMonto] = useState(''); 
  // Estado para el ID del usuario destino
  const [userIdDestino, setUserIdDestino] = useState('');
  // Estados para manejar la carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pestaña, setPestaña] = useState('inicio'); 

  const handleUsuarioChange = (e) => setUsuario(e.target.value);
  const handleUserIdDestinoChange = (e) => {
    setUserIdDestino(e.target.value);
    setError(''); // Limpiar error al escribir
    setSuccess(''); // Limpiar mensaje de éxito
  };

  // FUNCIÓN CORREGIDA: Bloquea letras y el signo menos (-)
  const handleMontoChange = (e) => {
    let valor = e.target.value;
    
    // EXPRESIÓN REGULAR CORREGIDA: 
    // 1. Reemplaza cualquier cosa que NO sea un número (0-9) o un punto decimal (.) por vacío.
    // 2. Esto bloquea estrictamente letras, el signo menos (-) y otros caracteres especiales.
    const valorLimpio = valor.replace(/[^\d.]/g, '');
    
    // Opcional: Esto asegura que solo haya un punto decimal, útil para montos.
    const parts = valorLimpio.split('.');
    if (parts.length > 2) {
      valor = parts[0] + '.' + parts.slice(1).join('');
    } else {
      valor = valorLimpio;
    }

    setMonto(valor);
    setError(''); // Limpiar error al escribir
    setSuccess(''); // Limpiar mensaje de éxito
  };
  
  // Función para enviar transacción conectada al backend
  const handleEnviar = async () => {
    // Validaciones
    if (!userIdDestino.trim()) {
      setError('Por favor ingresa el ID del usuario destino');
      return;
    }
    
    if (!monto || parseFloat(monto) <= 0) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Llamar al endpoint de envío del backend
      const response = await fetch(`${API_BASE_URL}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userIdDestino.trim(),
          amount: parseFloat(monto)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Transacción enviada exitosamente a ${userIdDestino}. Monto: $${monto}`);
        setMonto(''); // Limpiar el campo de monto
        setUserIdDestino(''); // Limpiar el campo de usuario destino
      } else {
        setError(data.error || 'Error al enviar la transacción');
      }
    } catch (err) {
      console.error('Error al conectar con el backend:', err);
      setError('Error de conexión. Asegúrate de que el backend esté ejecutándose en http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Encabezado */}
      <header className="app-header">
        <h1 className="logo">OpenPay+ 💠</h1>
        <div className="user-tag">{usuario}</div>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        {pestaña === 'inicio' && (
          <>
            <div className="card saldo-card">
              <h2>Saldo disponible</h2>
              <p className="saldo">${saldo.toLocaleString()} MXN</p>
              <button onClick={handleEnviar}>Enviar dinero</button>
            </div>
          </>
        )}

        {pestaña === 'transferir' && (
          <div className="card">
            <h2>Transferir fondos</h2>
            <input
              className="input"
              type="text"
              placeholder="ID del usuario destino (ej: humberto_wallet)"
              value={userIdDestino}
              onChange={handleUserIdDestinoChange}
              disabled={loading}
            />
            <input
              className="input"
              // CAMBIO CLAVE: Se cambió a type="text" para poder controlar la entrada estrictamente
              type="text" 
              placeholder="Monto"
              // El patrón inputmode="decimal" ayuda a abrir el teclado numérico en móviles
              inputMode="decimal" 
              value={monto} 
              onChange={handleMontoChange}
              disabled={loading}
            />
            {error && (
              <div style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ color: 'green', marginTop: '10px', fontSize: '14px' }}>
                {success}
              </div>
            )}
            <button 
              onClick={handleEnviar}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Enviando...' : 'Confirmar envío'}
            </button>
          </div>
        )}

        {pestaña === 'recibir' && (
          <div className="card">
            <h2>Recibir dinero</h2>
            <p>Comparte tu usuario para recibir transferencias:</p>
            <div className="user-box">{usuario}</div>
          </div>
        )}

        {pestaña === 'historial' && (
          <div className="history">
            <h3>Movimientos recientes</h3>
            <ul>
              <li><span>Pago a “TechStore”</span><span>- $499</span></li>
              <li><span>Depósito internacional</span><span>+ $2,100</span></li>
              <li><span>Transferencia de “Carlos”</span><span>+ $350</span></li>
            </ul>
          </div>
        )}

        {pestaña === 'config' && (
          <div className="user-login">
            <label htmlFor="usuario">Editar nombre de usuario</label>
            <input
              id="usuario"
              type="text"
              placeholder="Ej. AnaRaquel"
              value={usuario}
              onChange={handleUsuarioChange}
            />
            <p className="hint">Este nombre se usará en tus transacciones</p>
          </div>
        )}
      </main>

      {/* Barra inferior de navegación */}
      <nav className="bottom-nav">
        <button onClick={() => setPestaña('inicio')} className={pestaña === 'inicio' ? 'active' : ''}>🏠 Inicio</button>
        <button onClick={() => setPestaña('transferir')} className={pestaña === 'transferir' ? 'active' : ''}>💸 Transferir remesas</button>
        <button onClick={() => setPestaña('recibir')} className={pestaña === 'recibir' ? 'active' : ''}>📥 Recibir remesas</button>
        <button onClick={() => setPestaña('historial')} className={pestaña === 'historial' ? 'active' : ''}>🧾 Historial</button>
        <button onClick={() => setPestaña('config')} className={pestaña === 'config' ? 'active' : ''}>⚙️ Config</button>
      </nav>
    </div>
  );
}