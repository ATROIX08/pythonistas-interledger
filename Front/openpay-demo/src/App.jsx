import React, { useState, useEffect } from "react";
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5000/api";

function App() {
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("home");
  const [error, setError] = useState("");

  // ===========================
  // 🧩 Obtener datos del usuario
  // ===========================
  const fetchUser = async () => {
    if (!sender) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/user/${sender}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);
      setBalance(data.wallet.balance || 0);
      setHistory(data.wallet.history || []);
    } catch (err) {
      console.error(err);
      setError("Error al obtener datos del usuario.");
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // 💸 Enviar transferencia
  // ===========================
  const handleTransfer = async () => {
    if (!sender || !recipient || !amount) {
      alert("Por favor completa todos los campos.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_public_name: sender,
          recipient_wallet_url: recipient,
          amount,
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error);
      alert("✅ Transferencia realizada con éxito");
      fetchUser();
    } catch (err) {
      console.error(err);
      setError("Error al realizar la transferencia.");
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // 📲 Render principal
  // ===========================
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">💳 OpenPay Demo</div>
        {sender && <div className="user-tag">@{sender}</div>}
      </header>

      <main className="main-content">
        {/* Pestaña HOME */}
        {view === "home" && (
          <div className="card saldo-card">
            <h2>Saldo actual</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : (
              <p className="saldo">
                {balance !== null ? `${balance} Ⓝ` : "Ingresa tu usuario"}
              </p>
            )}
            <button onClick={fetchUser}>🔄 Actualizar</button>
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
        )}

        {/* Pestaña TRANSFERIR */}
        {view === "transfer" && (
          <div className="card user-login">
            <h2>Transferir fondos</h2>
            <input
              className="input"
              placeholder="Tu nombre público (sender)"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
            <input
              className="input"
              placeholder="Wallet del destinatario (URL completa)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Monto a enviar"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button onClick={handleTransfer} disabled={loading}>
              {loading ? "Procesando..." : "Enviar"}
            </button>
          </div>
        )}

        {/* Pestaña CONFIG */}
        {view === "config" && (
          <div className="card user-login">
            <h2>Configurar usuario</h2>
            <label>Nombre público (public name):</label>
            <input
              type="text"
              placeholder="Ejemplo: bryan"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
            <button onClick={fetchUser}>Guardar / Cargar</button>
          </div>
        )}

        {/* Historial de transacciones */}
        {view === "home" && history.length > 0 && (
          <div className="history">
            <h3>Historial reciente</h3>
            <ul>
              {history.map((tx, i) => (
                <li key={i}>
                  <span>{tx.description}</span>
                  <span>{tx.amount} Ⓝ</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          onClick={() => setView("home")}
          className={view === "home" ? "active" : ""}
        >
          Inicio
        </button>
        <button
          onClick={() => setView("transfer")}
          className={view === "transfer" ? "active" : ""}
        >
          Transferir
        </button>
        <button
          onClick={() => setView("config")}
          className={view === "config" ? "active" : ""}
        >
          Config
        </button>
      </nav>
    </div>
  );
}

export default App;
