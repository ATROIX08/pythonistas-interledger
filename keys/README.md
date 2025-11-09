# 🔐 Keys Directory

This directory contains the cryptographic keys required for authenticating with Open Payments wallets.

## 📁 Directory Structure

Your keys should be organized as follows:

```
keys/
├── private_wallet_usd.key    # Private key for USD wallet
├── public_wallet_usd.key     # Public key for USD wallet
├── private_wallet_eur.key    # Private key for EUR wallet
├── public_wallet_eur.key     # Public key for EUR wallet
├── private_wallet_mxn.key    # Private key for MXN wallet
├── public_wallet_mxn.key     # Public key for MXN wallet
├── private_wallet_gbp.key    # Private key for GBP wallet
├── public_wallet_gbp.key     # Public key for GBP wallet
├── private_wallet_cad.key    # Private key for CAD wallet
├── public_wallet_cad.key     # Public key for CAD wallet
└── ...                       # Additional wallet keys as needed
```

## 🔑 Key Format

All keys must be in **PEM format**. Here's what they should look like:

### Private Key Format

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15j7c4/GZXfU5Y7Z0fv7XzZqE5MnQvQZ0V2Xq/
...
-----END PRIVATE KEY-----
```

### Public Key Format

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tfn1iHD5teY+3OPxmV31OWO2dH7+182ahOTJ0L0GdFdl6v8f5Ejne
...
-----END PUBLIC KEY-----
```

## 🔨 Generating Keys

### Option 1: Using OpenSSL (Recommended for Ed25519)

Ed25519 is the recommended algorithm for Open Payments:

```bash
# Generate Ed25519 private key
openssl genpkey -algorithm Ed25519 -out keys/private_wallet_usd.key

# Extract public key from private key
openssl pkey -in keys/private_wallet_usd.key -pubout -out keys/public_wallet_usd.key
```

### Option 2: Using OpenSSL (RSA Alternative)

If Ed25519 is not available, you can use RSA:

```bash
# Generate RSA private key (2048 bits minimum)
openssl genrsa -out keys/private_wallet_usd.key 2048

# Extract public key from private key
openssl rsa -in keys/private_wallet_usd.key -pubout -out keys/public_wallet_usd.key
```

### Option 3: Generate Through Rafiki.money

The easiest way is to let Rafiki generate keys for you:

1. Visit [https://rafiki.money/](https://rafiki.money/)
2. Create a wallet for your desired currency
3. Navigate to the "Keys" or "API Keys" section
4. Click "Generate Key Pair"
5. Download both the private and public keys
6. Save them in this directory with the appropriate names

## 🔒 Security Best Practices

### ⚠️ Important Security Notes:

1. **Never commit private keys to version control**
   - The `.gitignore` file is configured to exclude `*.key` and `*.pem` files
   - Double-check before committing

2. **Set proper file permissions** (Linux/Mac):
   ```bash
   chmod 600 keys/*.key
   ```

3. **Keep private keys secret**
   - Never share private keys
   - Never send them via email or messaging apps
   - Never upload them to public locations

4. **Use different keys for different environments**
   - Development keys for testing
   - Production keys for live systems
   - Never mix them

5. **Backup your keys securely**
   - Store backups in encrypted storage
   - Use a password manager for production keys
   - Keep offline backups in a secure location

## 📝 Naming Convention

Follow this naming pattern for consistency:

- **Private keys**: `private_wallet_<CURRENCY>.key`
  - Examples: `private_wallet_usd.key`, `private_wallet_eur.key`

- **Public keys**: `public_wallet_<CURRENCY>.key`
  - Examples: `public_wallet_usd.key`, `public_wallet_eur.key`

The currency code should match the one used in your `.env` file configuration.

## 🔄 Linking Keys to Wallets

After generating your keys, you need to:

1. **Upload the public key to your Open Payments provider**
   - Log in to your wallet provider (e.g., Rafiki.money)
   - Navigate to your wallet's API settings
   - Upload or paste your public key
   - You'll receive a `KEY_ID` - save this!

2. **Configure your environment variables**
   - Open the `.env` file in the project root
   - Add the wallet configuration with the KEY_ID
   - Point to the correct key file paths

Example `.env` configuration:

```bash
WALLET_USD_URL=https://ilp-test.openpayments.com/your-username-usd
WALLET_USD_KEY_ID=abc123-def456-ghi789  # This is provided by Rafiki
WALLET_USD_PRIVATE_KEY_PATH=./keys/private_wallet_usd.key
WALLET_USD_PUBLIC_KEY_PATH=./keys/public_wallet_usd.key
```

## 🧪 Testing Your Keys

To verify your keys are configured correctly:

1. Start the server:
   ```bash
   npm start
   ```

2. Check the console for any key-related errors

3. Try accessing the wallets API:
   ```bash
   curl http://localhost:3000/api/wallets
   ```

4. If configured correctly, you should see your wallets listed

## ❓ Troubleshooting

### "Invalid key format" error

**Solution**: Ensure your key file:
- Is in PEM format (starts with `-----BEGIN...`)
- Has no extra whitespace or characters
- Is readable by the application (`chmod 644` on Linux/Mac)

### "Key not found" error

**Solution**: Check that:
- The key file path in `.env` is correct
- The file exists in this directory
- The filename matches exactly (case-sensitive)

### "Authentication failed" error

**Solution**: Verify that:
- The public key was uploaded to your wallet provider
- The KEY_ID in `.env` matches the one from your provider
- The private key corresponds to the uploaded public key
- The wallet URL is correct

### "Permission denied" error

**Solution** (Linux/Mac):
```bash
chmod 600 keys/private_*.key
chmod 644 keys/public_*.key
```

## 📚 Additional Resources

- **Open Payments Documentation**: [https://openpayments.guide/](https://openpayments.guide/)
- **Cryptographic Best Practices**: [https://www.openssl.org/docs/](https://www.openssl.org/docs/)
- **Ed25519 Information**: [https://ed25519.cr.yp.to/](https://ed25519.cr.yp.to/)

## 🆘 Need Help?

If you're setting up this project for the hackathon evaluation and need assistance:

1. Check the main [README.md](../readme.md) for complete documentation
2. Review the [env.template](../env.template) file for configuration examples
3. Open an issue on GitHub: [https://github.com/ATROIX08/pythonistas-interledger/issues](https://github.com/ATROIX08/pythonistas-interledger/issues)

---

**Note for Hackathon Evaluators**: This project includes test keys for demonstration purposes. In a production environment, all keys would be managed using secure key management systems (e.g., AWS KMS, Azure Key Vault, HashiCorp Vault).

