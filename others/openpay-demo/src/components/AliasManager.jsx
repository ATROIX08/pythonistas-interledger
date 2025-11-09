import React, { useState } from 'react';

function AliasModal({ aliases, setAliases, onClose }) {
    const [aliasName, setAliasName] = useState('');
    const [currency, setCurrency] = useState('');
    const [url, setUrl] = useState('');
    const [message, setMessage] = useState({ text: '', type: 'success' });

    const handleSubmit = (event) => {
        event.preventDefault();
        // Lógica para añadir/actualizar alias (sin cambios)
        const upperCaseCurrency = currency.toUpperCase();
        const existingWallets = aliases[aliasName] || [];
        const walletIndex = existingWallets.findIndex(w => w.currency === upperCaseCurrency);
        let updatedWallets;
        if (walletIndex !== -1) {
            updatedWallets = [...existingWallets];
            updatedWallets[walletIndex] = { currency: upperCaseCurrency, url };
        } else {
            updatedWallets = [...existingWallets, { currency: upperCaseCurrency, url }];
        }
        const newAliases = { ...aliases, [aliasName]: updatedWallets };
        setAliases(newAliases);
        localStorage.setItem('aliases', JSON.stringify(newAliases));
        setMessage({ text: `Alias '${aliasName}' guardado con divisa ${upperCaseCurrency}.`, type: 'success' });
        setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
        setAliasName(''); setCurrency(''); setUrl('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                <h2>Gestionar Cuentas</h2>
                <p>Añade o actualiza un alias con una URL para una divisa específica.</p>
                <form onSubmit={handleSubmit}>
                    {/* El formulario es el mismo de antes */}
                    <div className="form-group">
                        <label htmlFor="alias-name">Alias</label>
                        <input type="text" value={aliasName} onChange={(e) => setAliasName(e.target.value)} placeholder="Ej: Juan Pérez" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="currency">Divisa</label>
                        <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Ej: USD, MXN, EUR" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="alias-url">URL de la Wallet</label>
                        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://wallet.example.com/..." required />
                    </div>
                    <button type="submit" className="btn">Guardar Cuenta</button>
                </form>
                {message.text && <p style={{ marginTop: '1rem', color: message.type === 'error' ? 'red' : 'green' }}>{message.text}</p>}

                <div className="saved-aliases-list">
                    <h4>Cuentas Guardadas</h4>
                    {Object.keys(aliases).length > 0 ? (
                        <ul>
                            {Object.entries(aliases).map(([alias, wallets]) => (
                                <li key={alias}>
                                    <strong>{alias}:</strong> {wallets.map(w => w.currency).join(', ')}
                                </li>
                            ))}
                        </ul>
                    ) : <p>Aún no has guardado ninguna cuenta.</p>}
                </div>
            </div>
        </div>
    );
}

export default AliasModal;