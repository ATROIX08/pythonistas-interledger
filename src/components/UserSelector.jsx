import React from 'react';

function UserSelector({ aliases, myAlias, setMyAlias }) {
    
    const handleAliasChange = (event) => {
        const selected = event.target.value;
        setMyAlias(selected);
        // Guardar en localStorage para recordar la selección
        localStorage.setItem('myAlias', selected);
    };

    const aliasKeys = Object.keys(aliases);

    return (
        <section className="card user-selector-card">
            <h2>Bienvenido</h2>
            <p>Para comenzar, selecciona tu alias de remitente.</p>
            <select value={myAlias} onChange={handleAliasChange}>
                <option value="">-- Selecciona tu Alias --</option>
                {aliasKeys.map(alias => (
                    <option key={alias} value={alias}>{alias}</option>
                ))}
            </select>
            {aliasKeys.length === 0 && (
                <p style={{ marginTop: '1rem', color: '#888' }}>
                    No tienes alias guardados. Añade uno en "Gestionar Cuentas".
                </p>
            )}
        </section>
    );
}

export default UserSelector;