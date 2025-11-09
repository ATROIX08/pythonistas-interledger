# -*- coding: utf-8 -*-
"""
Created on Sat Nov  8 14:41:56 2025

@author: Admin
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from typing import Optional
import requests
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Habilita CORS para desarrollo local

def get_wallet_url_from_db(public_name: str) -> Optional[str]:
    """
    Busca en la base de datos local para encontrar la URL de la billetera
    asociada con un public_name.
    """
    try:
        # 'with' se encarga de cerrar la conexión automáticamente
        db_path = os.path.join(os.path.dirname(__file__), 'wallets.db')
        with sqlite3.connect(db_path) as conn:
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

def get_wallet_info_by_public_name(public_name: str) -> Optional[dict]:
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
    
    # 2. Usar la URL para consultar la API de Open Payments (dummy por ahora)
    try:
        print("Consultando la API de Open Payments...")
        # Por ahora, devolvemos datos dummy como se solicitó
        return {
            'id': wallet_url,
            'publicName': public_name,
            'walletUrl': wallet_url,
            'assetCode': 'EUR',
            'assetScale': 2,
            'authServer': 'https://auth.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c',
            'resourceServer': 'https://ilp.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c'
        }
        
    except Exception as e:
        print(f"Error al obtener información de la billetera: {e}")
        return None

@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    """
    Endpoint para obtener información de un usuario por su ID (public_name).
    """
    try:
        user_info = get_wallet_info_by_public_name(user_id)
        
        if user_info:
            return jsonify({
                'success': True,
                'data': user_info
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'Usuario con ID "{user_id}" no encontrado'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al buscar usuario: {str(e)}'
        }), 500

@app.route('/api/send', methods=['POST'])
def send_transaction():
    """
    Endpoint para enviar una transacción.
    Verifica si el usuario existe, obtiene su URL y hace un GET dummy.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No se proporcionaron datos'
            }), 400
        
        user_id = data.get('user_id')
        amount = data.get('amount')
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Se requiere user_id'
            }), 400
        
        if not amount:
            return jsonify({
                'success': False,
                'error': 'Se requiere amount'
            }), 400
        
        # Verificar si el usuario existe y obtener sus datos
        user_info = get_wallet_info_by_public_name(user_id)
        
        if not user_info:
            return jsonify({
                'success': False,
                'error': f'Usuario con ID "{user_id}" no encontrado'
            }), 404
        
        wallet_url = user_info.get('walletUrl')
        
        # Hacer un GET dummy a la URL del usuario
        try:
            print(f"Haciendo GET dummy a: {wallet_url}")
            # Por ahora, simulamos el GET sin hacer la llamada real
            # En el futuro, aquí se haría: response = requests.get(wallet_url, timeout=10)
            dummy_response = {
                'status': 'success',
                'message': 'GET dummy realizado correctamente',
                'walletUrl': wallet_url,
                'amount': amount,
                'userInfo': user_info
            }
            
            return jsonify({
                'success': True,
                'data': dummy_response
            }), 200
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error al realizar GET a la URL del usuario: {str(e)}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al procesar la transacción: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Endpoint de salud para verificar que el servidor está funcionando.
    """
    return jsonify({
        'status': 'ok',
        'message': 'Backend funcionando correctamente'
    }), 200

if __name__ == "__main__":
    # Verificar que la base de datos existe
    db_path = os.path.join(os.path.dirname(__file__), 'wallets.db')
    if not os.path.exists(db_path):
        print("ADVERTENCIA: La base de datos wallets.db no existe.")
        print("Ejecuta 'python manage_database.py init' para crearla.")
    
    # Ejecutar el servidor Flask en modo desarrollo
    app.run(host='0.0.0.0', port=5000, debug=True)
