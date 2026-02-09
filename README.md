# algochat-cli

CLI client for [AlgoChat](https://github.com/CorvidLabs/protocol-algochat) — encrypted on-chain messaging on Algorand.

## Install

```bash
bun install
```

## Usage

```bash
# Generate a new account
bun run dev keygen

# Check balance
ALGOCHAT_MNEMONIC="your 25 words..." bun run dev balance

# Send a message
ALGOCHAT_MNEMONIC="your 25 words..." bun run dev send RECIPIENT_ADDRESS "Hello from AlgoChat"

# Read recent messages
ALGOCHAT_MNEMONIC="your 25 words..." bun run dev read
```

## Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `ALGOCHAT_MNEMONIC` | 25-word Algorand mnemonic | Required for send |
| `ALGOCHAT_NETWORK` | `testnet` or `mainnet` | `testnet` |

## Commands

| Command | Description |
|---------|-------------|
| `send <address> <message>` | Send a message to an address |
| `read [address]` | Read recent messages |
| `balance [address]` | Check account balance |
| `status` | Show network status |
| `keygen` | Generate a new Algorand account |

## Protocol

Messages are sent as Algorand payment transactions with content in the note field. The AlgoChat protocol supports encryption via X25519 key exchange and XChaCha20-Poly1305. This CLI currently sends plaintext — encrypted messaging will be added once `@corvidlabs/ts-algochat` is published.

## License

MIT
