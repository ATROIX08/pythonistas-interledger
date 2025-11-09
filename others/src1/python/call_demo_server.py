
# -*- coding: utf-8 -*-
import requests, time, json

BASE = "http://localhost:4000"

def pretty(x): print(json.dumps(x, indent=2, ensure_ascii=False))

print("1) /wallet-info")
pretty(requests.get(f"{BASE}/wallet-info", timeout=15).json())

print("\n2) /incoming")
pretty(requests.post(f"{BASE}/incoming", timeout=30).json())

print("\n3) /quote")
pretty(requests.post(f"{BASE}/quote", timeout=30).json())

print("\n4) /pay/start")
start = requests.get(f"{BASE}/pay/start", timeout=30).json()
pretty(start)
print("\nAbre en el navegador:", start["redirect"])

input("\nCuando ya regreses de aprobar (verás '✅ Grant confirmado' en /pay/finish), ENTER para seguir...")

print("\n5) /pay/execute")
out = requests.post(f"{BASE}/pay/execute", timeout=60).json()
pretty(out)

if "id" in out:
    print("\n6) Polling de estado (opcional)")
    time.sleep(2)
    status = requests.get(f"{BASE}/outgoing/status", params={"id": out["id"]}, timeout=30).json()
    pretty(status)
