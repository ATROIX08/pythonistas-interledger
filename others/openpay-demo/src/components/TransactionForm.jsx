import React, { useState, useEffect } from 'react';
// (La constante API_BASE_URL sigue igual)
const API_BASE_URL = 'http://localhost:5000';

function TransactionForm({ myAlias, aliases }) {
    const [recipientAlias, setRecipientAlias] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    
    // La divisa del remitente ahora se basa en el alias seleccionado
    const [senderCurrencies, setSenderCurrencies] = useState([]);
    const [recipientCurrencies, setRecipientCurrencies] = useState([]);
    const [selectedSenderCurrency, setSelectedSenderCurrency] = useState('');
    const [selectedRecipientCurrency, setSelectedRecipientCurrency] = useState('');
    const [responseMsg, setResponseMsg] = useState({ text: '', type: '' });

    // Efecto para actualizar las divisas del REMITENTE
    useEffect(() => {
        const available = myAlias ? aliases[myAlias] || [] : [];
        setSenderCurrencies(available);
        setSelectedSenderCurrency(''); // Resetear al cambiar de alias
    }, [myAlias, aliases]);

    // Efecto para las divisas del DESTINATARIO (sin cambios)
    useEffect(() => {
        const available = aliases[recipientAlias] || [];
        setRecipientCurrencies(available);
        setSelectedRecipientCurrency('');
    }, [recipientAlias, aliases]);

    const handleSubmit = async (event) => {
        // ... La lógica del handleSubmit sigue siendo la misma que en la respuesta anterior ...
        event.preventDefault();
        // ... (la puedes copiar de la respuesta anterior) ...
    };

    const isFormDisabled = !myAlias;

    return (
        <div className={isFormDisabled ? 'transaction-form-disabled' : ''}>
            <section className="card transaction-form">
                <h2>Realizar Envío</h2>
                {!myAlias && <p style={{textAlign: 'center', color: 'orange'}}>Selecciona tu alias de remitente para empezar.</p>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tu Alias (Remitente)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <input type="text" value={myAlias || 'No seleccionado'} disabled style={{ flex: 1, backgroundColor: '#eee' }} />
                           {senderCurrencies.length > 0 && (
                                <select value={selectedSenderCurrency} onChange={(e) => setSelectedSenderCurrency(e.target.value)} required disabled={isFormDisabled}>
                                    <option value="">Selecciona divisa</option>
                                    {senderCurrencies.map(w => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                                </select>
                           )}
                        </div>
                    </div>

                    <div className="form-group">
                       {/* El campo del destinatario sigue igual que en la respuesta anterior */}
                    </div>
                    
                    {/* ... El resto del formulario (datalist, monto, descripción, botón) sigue igual ... */}
                    {/* ... Puedes copiarlo de la respuesta anterior ... */}
                </form>
                 {responseMsg.text && (
                    <div id="response-message" className={responseMsg.type}>
                        {responseMsg.text}
                    </div>
                )}
            </section>
        </div>
    );
}

export default TransactionForm;