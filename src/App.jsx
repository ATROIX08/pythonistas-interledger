import React, { useState, useEffect } from 'react';
import UserSelector from './components/UserSelector';
import AliasModal from './components/AliasModal';
import TransactionForm from './components/TransactionForm';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
    const [isSeniorMode, setIsSeniorMode] = useState(false);
    const [serverStatus, setServerStatus] = useState('Verificando...');
    const [showAliasModal, setShowAliasModal] = useState(false);

    const [aliases, setAliases] = useState(() => {
        try {
            const saved = localStorage.getItem('aliases');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [myAlias, setMyAlias] = useState(() => localStorage.getItem('myAlias') || '');

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
    
    useEffect(() => {
        document.body.className = isSeniorMode ? 'senior-mode' : '';
    }, [isSeniorMode]);

    const statusColor = serverStatus === 'Conectado' ? 'green' : 'red';

    return (
        <div className="container">
            {showAliasModal && (
                <AliasModal 
                    aliases={aliases} 
                    setAliases={setAliases} 
                    onClose={() => setShowAliasModal(false)} 
                />
            )}
            
            <header>
                <h1>Remesas Simplificadas</h1>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowAliasModal(true)} className="btn">Gestionar Cuentas</button>
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
                </div>
            </header>

            <main>
                <UserSelector aliases={aliases} myAlias={myAlias} setMyAlias={setMyAlias} />
                <TransactionForm myAlias={myAlias} aliases={aliases} />
            </main>

            <footer>
                <p>Estado del Servidor: <span style={{ color: statusColor, fontWeight: 'bold' }}>{serverStatus}</span></p>
            </footer>
        </div>
    );
}

export default App;