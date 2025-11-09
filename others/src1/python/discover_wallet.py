# -*- coding: utf-8 -*-
import os
import json
import requests

WALLET_URL = os.getenv("WALLET_URL", "https://ilp.interledger-test.dev/183dbd98")

def main():
    r = requests.get(WALLET_URL, timeout=15)
    r.raise_for_status()
    account_info = r.json()
    print("Wallet Address Info (discovery):")
    print(json.dumps(account_info, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()