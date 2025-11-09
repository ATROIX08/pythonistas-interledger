# -*- coding: utf-8 -*-
"""
Created on Sat Nov  8 14:29:51 2025

@author: Admin
"""

import sqlite3 

# Conectarse a la base de datos (se creará si no existe)
conn = sqlite3.connect('wallets.db')
cursor = conn.cursor()

# Crear la tabla 'wallets' si no existe
# Hacemos que public_name sea UNIQUE para asegurar que no haya duplicados
cursor.execute('''
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_name TEXT NOT NULL UNIQUE,
    wallet_url TEXT NOT NULL
);
''')


# Insertar datos de ejemplo (dummy data)
# Usamos INSERT OR IGNORE para no insertar duplicados si el script se ejecuta de nuevo
wallets_to_add = [
    ('humberto_wallet', 'https://ilp.interledger-test.dev/183dbd98'),
    ('alice_wallet', 'https://ilp.interledger-test.dev/alice-wallet-id'),
    ('bob_store', 'https://ilp.interledger-test.dev/bob-store-id'),
    ('charlie_savings', 'https://ilp.interledger-test.dev/charlie-savings-id')
]

cursor.executemany('INSERT OR IGNORE INTO wallets (public_name, wallet_url) VALUES (?, ?)', wallets_to_add)

# Guardar los cambios y cerrar la conexión
conn.commit()
conn.close()

print("Base de datos 'wallets.db' creada y poblada con éxito.")