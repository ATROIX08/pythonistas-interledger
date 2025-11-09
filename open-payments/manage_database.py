# -*- coding: utf-8 -*-
"""
Created on Sat Nov  8 16:47:48 2025

@author: Admin
"""

import sqlite3
import sys

DB_FILE = 'wallets.db'

def initialize_database():
    """Crea la tabla 'wallets' si no existe."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_name TEXT NOT NULL UNIQUE,
            wallet_url TEXT NOT NULL
        );
        ''')
        conn.commit()

def populate_initial_data():
    """Inserta los datos de ejemplo originales en la base de datos."""
    wallets_to_add = [
        ('humberto_wallet', 'https://ilp.interledger-test.dev/183dbd98'),
        ('alice_wallet', 'https://ilp.interledger-test.dev/alice-wallet-id'),
        ('bob_store', 'https://ilp.interledger-test.dev/bob-store-id'),
        ('charlie_savings', 'https://ilp.interledger-test.dev/charlie-savings-id')
    ]
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.executemany('INSERT OR IGNORE INTO wallets (public_name, wallet_url) VALUES (?, ?)', wallets_to_add)
            conn.commit()
            print("Base de datos poblada con los datos iniciales.")
    except sqlite3.Error as e:
        print(f"Error al poblar la base de datos: {e}")

def add_wallet(public_name, wallet_url):
    """Añade una nueva billetera a la base de datos."""
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO wallets (public_name, wallet_url) VALUES (?, ?)", (public_name, wallet_url))
            conn.commit()
            print(f" Éxito: Se agregó '{public_name}' a la base de datos.")
    except sqlite3.IntegrityError:
        print(f" Error: El public_name '{public_name}' ya existe. No se agregó nada.")
    except sqlite3.Error as e:
        print(f" Error en la base de datos: {e}")

def delete_wallet(public_name):
    """Elimina una billetera de la base de datos por su public_name."""
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM wallets WHERE public_name = ?", (public_name,))
            # Verificar si se eliminó alguna fila
            if cursor.rowcount == 0:
                print(f" Error: No se encontró ninguna billetera con el public_name '{public_name}'.")
            else:
                conn.commit()
                print(f" Éxito: Se eliminó '{public_name}' de la base de datos.")
    except sqlite3.Error as e:
        print(f" Error en la base de datos: {e}")

def update_wallet(public_name, new_wallet_url):
    """Modifica la URL de una billetera existente."""
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE wallets SET wallet_url = ? WHERE public_name = ?", (new_wallet_url, public_name))
            if cursor.rowcount == 0:
                print(f" Error: No se encontró ninguna billetera con el public_name '{public_name}' para actualizar.")
            else:
                conn.commit()
                print(f" Éxito: Se actualizó la URL de '{public_name}'.")
    except sqlite3.Error as e:
        print(f" Error en la base de datos: {e}")

def list_wallets():
    """Muestra todas las entradas de la base de datos."""
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT public_name, wallet_url FROM wallets ORDER BY public_name")
        results = cursor.fetchall()
        if not results:
            print("La base de datos está vacía.")
            return
        
        print("-" * 60)
        print(f"{'PUBLIC NAME':<25} | {'WALLET URL'}")
        print("-" * 60)
        for row in results:
            print(f"{row[0]:<25} | {row[1]}")
        print("-" * 60)

def show_usage():
    """Muestra el mensaje de ayuda."""
    print("\n--- Herramienta de Gestión de Billeteras ---")
    print("Uso: python manage_wallets.py [comando] [argumentos...]")
    print("\nComandos disponibles:")
    print("  init              - Crea la tabla y la puebla con datos de ejemplo.")
    print("  list              - Muestra todas las billeteras en la base de datos.")
    print("  add <name> <url>  - Agrega una nueva billetera.")
    print("  del <name>        - Elimina una billetera por su nombre.")
    print("  mod <name> <url>  - Modifica la URL de una billetera existente.")
    print("\nEjemplos:")
    print("  python manage_wallets.py add laura_billetera https://example.com/laura")
    print("  python manage_wallets.py del alice_wallet")
    print("  python manage_wallets.py mod bob_store https://new-store.com/bob")

if __name__ == "__main__":
    initialize_database()
    
    if len(sys.argv) < 2:
        show_usage()
        sys.exit(1)
        
    command = sys.argv[1].lower()

    if command == "list":
        list_wallets()
    elif command == "init":
        populate_initial_data()
    elif command == "add":
        if len(sys.argv) != 4:
            print("Error: El comando 'add' requiere un nombre y una URL.")
            show_usage()
        else:
            add_wallet(sys.argv[2], sys.argv[3])
    elif command == "del":
        if len(sys.argv) != 3:
            print("Error: El comando 'del' requiere un nombre.")
            show_usage()
        else:
            delete_wallet(sys.argv[2])
    elif command == "mod":
        if len(sys.argv) != 4:
            print("Error: El comando 'mod' requiere un nombre y una nueva URL.")
            show_usage()
        else:
            update_wallet(sys.argv[2], sys.argv[3])
    else:
        print(f"Error: Comando desconocido '{command}'")
        show_usage()