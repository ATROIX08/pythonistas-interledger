import requests

wallet_url = "https://ilp.interledger-test.dev/183dbd98"  # Dirección de billetera del destinatario
response = requests.get(wallet_url)
account_info = response.json()
print(account_info)