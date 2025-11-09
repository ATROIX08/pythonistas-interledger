# -*- coding: utf-8 -*-
"""
Created on Sat Nov  8 14:41:56 2025

@author: Admin
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import requests
import uuid
import time

app = Flask(__name__)
CORS(app)

def get_wallet_url_from_db(public_name: str):
    db_path = os.path.join(os.path.dirname(__file__), 'wallets.db')
    try:
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT wallet_url FROM wallets WHERE public_name = ?", (public_name,))
            result = cursor.fetchone()
            if result:
                return result[0]
    except sqlite3.Error as e:
        print(f"DB error: {e}")
    return None

def fetch_wallet_address_info(wallet_url: str):
    # GET the wallet address resource
    try:
        headers = {
            "Accept": "application/json"
        }
        resp = requests.get(wallet_url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Error fetching wallet address info: {e}")
        return None

@app.route('/api/user/<public_name>', methods=['GET'])
def get_user(public_name):
    wallet_url = get_wallet_url_from_db(public_name)
    if not wallet_url:
        return jsonify({ "success": False, "error": f"No wallet for user {public_name}" }), 404

    wallet_info = fetch_wallet_address_info(wallet_url)
    if not wallet_info:
        return jsonify({ "success": False, "error": "Could not fetch wallet info" }), 500

    return jsonify({ "success": True, "data": wallet_info }), 200

@app.route('/api/send', methods=['POST'])
def send_transaction():
    data = request.get_json()
    print("\n📦 Datos recibidos del front:", data)  # 👈 Agregado para depurar

    if not data:
        return jsonify({ "success": False, "error": "No data provided" }), 400

    sender_id = data.get('sender_public_name')
    recipient_wallet_url = data.get('recipient_wallet_url')
    amount = data.get('amount')

    if not sender_id or not recipient_wallet_url or not amount:
        print("❌ Faltan campos:", sender_id, recipient_wallet_url, amount)  # 👈 Agregado
        return jsonify({ "success": False, "error": "Missing sender_public_name, recipient_wallet_url or amount" }), 400

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({ "status": "ok", "message": "Backend funcionando correctamente" }), 200

if __name__ == "__main__":
    db_path = os.path.join(os.path.dirname(__file__), 'wallets.db')
    if not os.path.exists(db_path):
        print("Warning: wallets.db no existe. Cree la base de datos.")
    app.run(host='0.0.0.0', port=5000)
