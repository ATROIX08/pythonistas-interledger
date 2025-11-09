# -*- coding: utf-8 -*-
"""
Script de prueba para verificar que el backend funciona correctamente
"""

import requests
import json

BASE_URL = 'http://localhost:5000'

def test_health():
    """Prueba el endpoint de salud"""
    print("1. Probando endpoint de salud...")
    try:
        response = requests.get(f'{BASE_URL}/api/health')
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def test_get_user():
    """Prueba obtener un usuario existente"""
    print("\n2. Probando obtener usuario existente (humberto_wallet)...")
    try:
        response = requests.get(f'{BASE_URL}/api/user/humberto_wallet')
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200 and data.get('success')
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def test_get_user_not_found():
    """Prueba obtener un usuario que no existe"""
    print("\n3. Probando obtener usuario inexistente...")
    try:
        response = requests.get(f'{BASE_URL}/api/user/usuario_inexistente')
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 404
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def test_send_transaction():
    """Prueba enviar una transacción"""
    print("\n4. Probando enviar transacción...")
    try:
        payload = {
            'user_id': 'humberto_wallet',
            'amount': 100.50
        }
        response = requests.post(
            f'{BASE_URL}/api/send',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 200 and data.get('success')
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def test_send_transaction_invalid_user():
    """Prueba enviar a un usuario inválido"""
    print("\n5. Probando enviar a usuario inválido...")
    try:
        payload = {
            'user_id': 'usuario_inexistente',
            'amount': 100.50
        }
        response = requests.post(
            f'{BASE_URL}/api/send',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   Response: {json.dumps(data, indent=2)}")
        return response.status_code == 404
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PRUEBAS DEL BACKEND")
    print("=" * 60)
    print("\nAsegúrate de que el backend esté ejecutándose en http://localhost:5000")
    print("Ejecuta: python app.py\n")
    
    results = []
    results.append(("Health Check", test_health()))
    results.append(("Get User (existente)", test_get_user()))
    results.append(("Get User (no existe)", test_get_user_not_found()))
    results.append(("Send Transaction", test_send_transaction()))
    results.append(("Send Transaction (usuario inválido)", test_send_transaction_invalid_user()))
    
    print("\n" + "=" * 60)
    print("RESUMEN DE PRUEBAS")
    print("=" * 60)
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result for _, result in results)
    print("\n" + "=" * 60)
    if all_passed:
        print("¡Todas las pruebas pasaron! ✓")
    else:
        print("Algunas pruebas fallaron. Revisa los errores arriba.")
    print("=" * 60)

