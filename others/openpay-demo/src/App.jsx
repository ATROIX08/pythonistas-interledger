import React, { useState, useEffect } from 'react';
import AliasManager from './components/AliasManager';
import TransactionForm from './components/TransactionForm';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
    const [isSeniorMode, setIsSeniorMode] = useState(false);
    const [serverStatus, setServerStatus] = useState('Verificando...');
    
    // El estado de los alias se carga desde localStorage
    const [aliases, setAliases] = useState(() => {
        const savedAliases = localStorage.getItem('aliases');
        // Asegurarse de que los datos cargados sean un objeto
        try {
            const parsed = JSON.parse(savedAliases);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (e) {
            return {};
        }
    });

    // Efecto para verificar el estado del servidor
    useEffect(() => {
        const checkServerHealth = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/health`);
                setServerStatus(response.ok ? 'Conectado' : 'Desconectado');
            } catch (error) {
                setServerStatus('Desconectado');
            }
        };
        checkServerHealth();
    }, []);
    
    // Efecto para aplicar la clase del modo senior al body
    useEffect(() => {
        document.body.className = isSeniorMode ? 'senior-mode' : '';
    }, [isSeniorMode]);

    const statusColor = serverStatus === 'Conectado' ? 'green' : 'red';

    return (
        <div className="container">
            <header>
                <h1>Remesas Simplificadas</h1>
                <div className="accessibility-controls">
                    <label htmlFor="senior-mode-toggle">Modo Adulto Mayor</label>
                    <label className="switch">
                        <input
                            type="checkbox"
                            id="senior-mode-toggle"
                            checked={isSeniorMode}
                            onChange={() => setIsSeniorMode(!isSeniorMode)}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </header>

            <main>
                {/* Pasamos tanto aliases como setAliases a AliasManager */}
                <AliasManager aliases={aliases} setAliases={setAliases} />
                <TransactionForm aliases={aliases} />
            </main>

            <footer>
                <p>Estado del Servidor: <span style={{ color: statusColor, fontWeight: 'bold' }}>{serverStatus}</span></p>
            </footer>
        </div>
    );
}

export default App;