# -*- coding: utf-8 -*-
"""
Created on Sat Nov  8 14:41:56 2025

@author: Admin
"""

import requests
import sqlite3
import sys

def get_wallet_url_from_db(public_name: str) -> str | None:
    """
    Busca en la base de datos local para encontrar la URL de la billetera
    asociada con un public_name.
    """
    try:
        # 'with' se encarga de cerrar la conexión automáticamente
        with sqlite3.connect('wallets.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT wallet_url FROM wallets WHERE public_name = ?", (public_name,))
            result = cursor.fetchone() # fetchone() devuelve una tupla o None
            
            if result:
                return result[0] # Devolver el primer elemento de la tupla (la URL)
            else:
                return None
    except sqlite3.Error as e:
        print(f"Error en la base de datos: {e}")
        return None

def get_wallet_info_by_public_name(public_name: str) -> dict | None:
    """
    Función principal que resuelve el public_name a la información completa de la billetera.
    """
    print(f"\nIniciando búsqueda para el publicName: '{public_name}'...")
    
    # 1. Obtener la URL de la billetera desde nuestra base de datos local
    wallet_url = get_wallet_url_from_db(public_name)
    
    if not wallet_url:
        print(f"Error: No se pudo encontrar una URL de billetera para el publicName '{public_name}'.")
        return None
    
    print(f"URL de billetera encontrada en la base de datos local: {wallet_url}")
    
    # 2. Usar la URL para consultar la API de Open Payments
    try:
        print("Consultando la API de Open Payments...")
        response = requests.get(wallet_url, timeout=10)
        response.raise_for_status()  # Lanza un error para respuestas HTTP 4xx/5xx
        
        account_info = response.json()
        print("Información de la cuenta obtenida con éxito desde la API.")
        return account_info
        
    except requests.exceptions.RequestException as e:
        # Para la demo, simulamos una respuesta exitosa si la URL de prueba falla
        if "humberto_wallet" in public_name:
             print(f"ADVERTENCIA: La llamada real a la API falló ({e}). Devolviendo datos de muestra para la demostración.")
             return {
                'id': wallet_url,
                'publicName': public_name,
                'assetCode': 'EUR',
                'assetScale': 2,
                'authServer': 'https://auth.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c',
                'resourceServer': 'https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c'
             }
        else:
            print(f"Error al contactar la API de Open Payments: {e}")
            return None

if __name__ == "__main__":
    # Lee el public_name desde los argumentos de la línea de comandos
    if len(sys.argv) > 1:
        public_name_to_find = sys.argv[1]
    else:
        # Si no se proporciona un argumento, se detiene con un mensaje de error
        print("Error: Por favor, proporciona un 'publicName' como argumento.")
        print("Ejemplo: python app.py humberto_wallet")
        sys.exit(1)

    # Obtener la información de la billetera
    account_details = get_wallet_info_by_public_name(public_name_to_find)

    if account_details:
        print("\n--- Detalles de la Cuenta del Destinatario ---")
        # Imprimir el diccionario de forma legible
        import json
        print(json.dumps(account_details, indent=4))
        print("\nAhora puedes usar estos detalles para iniciar una transferencia.")