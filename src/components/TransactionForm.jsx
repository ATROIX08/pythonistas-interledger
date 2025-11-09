import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function TransactionForm({ myAlias, aliases }) {
    const [recipientAlias, setRecipientAlias] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    
    const [senderCurrencies, setSenderCurrencies] = useState([]);
    const [recipientCurrencies, setRecipientCurrencies] = useState([]);
    const [selectedSenderCurrency, setSelectedSenderCurrency] = useState('');
    const [selectedRecipientCurrency, setSelectedRecipientCurrency] = useState('');
    const [responseMsg, setResponseMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        const available = myAlias ? aliases[myAlias] || [] : [];
        setSenderCurrencies(available);
        if (available.length === 1) {
            setSelectedSenderCurrency(available[0].currency);
        } else {
            setSelectedSenderCurrency('');
        }
    }, [myAlias, aliases]);

    useEffect(() => {
        const available = aliases[recipientAlias] || [];
        setRecipientCurrencies(available);
        if (available.length === 1) {
            setSelectedRecipientCurrency(available[0].currency);
        } else {
            setSelectedRecipientCurrency('');
        }
    }, [recipientAlias, aliases]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setResponseMsg({ text: '', type: '' });

        if (!selectedSenderCurrency || !selectedRecipientCurrency) {
            setResponseMsg({ text: 'Debes seleccionar una divisa para ambos.', type: 'error' });
            return;
        }

        const recipientWallet = recipientCurrencies.find(w => w.currency === selectedRecipientCurrency);

        const transactionData = {
            sender_public_name: myAlias,
            recipient_wallet_url: recipientWallet.url,
            amount: parseFloat(amount),
            description: description,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setResponseMsg({ text: 'Transacción enviada con éxito.', type: 'success' });
                setRecipientAlias(''); setAmount(''); setDescription('');
            } else {
                setResponseMsg({ text: `Error: ${result.error || 'Ocurrió un problema'}`, type: 'error' });
            }
        } catch (error) {
            setResponseMsg({ text: 'Error de conexión con el servidor.', type: 'error' });
        }
    };

    const isFormDisabled = !myAlias;

    return (
        <div className={isFormDisabled ? 'transaction-form-disabled' : ''}>
            <section className="card transaction-form">
                <h2>Realizar Envío</h2>
                {!myAlias && <p style={{textAlign: 'center', color: '#dd8c14'}}>Selecciona tu alias de remitente para empezar.</p>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tu Alias (Remitente)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <input type="text" value={myAlias || 'No seleccionado'} disabled style={{ flex: 1, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
                           {senderCurrencies.length > 0 && (
                                <select value={selectedSenderCurrency} onChange={(e) => setSelectedSenderCurrency(e.target.value)} required disabled={isFormDisabled}>
                                    <option value="">Divisa</option>
                                    {senderCurrencies.map(w => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                                </select>
                           )}
                        </div>
                    </div>

                    <div className="form-group">
                       <label htmlFor="recipient-alias">Alias del Destinatario</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <input id="recipient-alias" type="text" value={recipientAlias} onChange={(e) => setRecipientAlias(e.target.value)} list="aliases-datalist" placeholder="Escribe el alias de quien recibe" required disabled={isFormDisabled} style={{ flex: 1 }} />
                           {recipientCurrencies.length > 0 && (
                               <select value={selectedRecipientCurrency} onChange={(e) => setSelectedRecipientCurrency(e.target.value)} required disabled={isFormDisabled}>
                                   <option value="">Divisa</option>
                                   {recipientCurrencies.map(w => <option key={w.currency} value={w.currency}>{w.currency}</option>)}
                               </select>
                           )}
                       </div>
                    </div>
                    
                    <datalist id="aliases-datalist">
                        {Object.keys(aliases).filter(alias => alias !== myAlias).map(alias => <option key={alias} value={alias} />)}
                    </datalist>

                    <div className="form-group">
                        <label htmlFor="amount">Monto ({selectedSenderCurrency || '...'})</label>
                        <input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" min="0.01" required disabled={isFormDisabled} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Descripción (Opcional)</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Ej: Pago de factura" disabled={isFormDisabled}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isFormDisabled}>Enviar Dinero</button>
                </form>
                 {responseMsg.text && (
                    <div id="response-message" className={responseMsg.type} style={{marginTop: '1rem'}}>
                        {responseMsg.text}
                    </div>
                )}
            </section>
        </div>
    );
}

export default TransactionForm;