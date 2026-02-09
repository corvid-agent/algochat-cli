#!/usr/bin/env bun
import algosdk from 'algosdk';
import { AlgoChatClient, TESTNET_CONFIG, MAINNET_CONFIG } from './client';

const HELP = `
algochat-cli — CLI client for AlgoChat on Algorand

Usage:
  algochat send <recipient> <message>   Send a message
  algochat read [address]               Read recent messages
  algochat balance [address]            Check account balance
  algochat status                       Network status
  algochat keygen                       Generate a new account
  algochat help                         Show this help

Environment:
  ALGOCHAT_MNEMONIC    25-word Algorand mnemonic (required for send)
  ALGOCHAT_NETWORK     "testnet" or "mainnet" (default: testnet)
`.trim();

function getClient(): AlgoChatClient {
  const network = process.env.ALGOCHAT_NETWORK ?? 'testnet';
  const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
  return new AlgoChatClient(config);
}

function getAccount(): algosdk.Account {
  const mnemonic = process.env.ALGOCHAT_MNEMONIC;
  if (!mnemonic) {
    console.error('Error: ALGOCHAT_MNEMONIC environment variable is required');
    process.exit(1);
  }
  return algosdk.mnemonicToSecretKey(mnemonic);
}

async function send(recipient: string, message: string): Promise<void> {
  const client = getClient();
  const account = getAccount();

  console.log(`Sending to ${recipient.slice(0, 8)}...`);
  const txid = await client.sendMessage(account, recipient, message);
  console.log(`Sent! txid: ${txid}`);
}

async function read(address?: string): Promise<void> {
  const client = getClient();
  const addr = address ?? getAccount().addr.toString();

  console.log(`Reading messages for ${addr.slice(0, 8)}...`);
  const messages = await client.getMessages(addr, { limit: 20 });

  if (messages.length === 0) {
    console.log('No messages found.');
    return;
  }

  for (const msg of messages) {
    const time = msg.timestamp
      ? new Date(msg.timestamp * 1000).toISOString()
      : `round ${msg.round}`;
    console.log(`\n[${time}] from ${msg.sender.slice(0, 8)}...`);
    console.log(`  ${msg.content}`);
  }
}

async function balance(address?: string): Promise<void> {
  const client = getClient();
  const addr = address ?? getAccount().addr.toString();

  const bal = await client.getBalance(addr);
  const algos = Number(bal) / 1_000_000;
  console.log(`${addr.slice(0, 8)}... balance: ${algos.toFixed(6)} ALGO`);
}

async function status(): Promise<void> {
  const client = getClient();
  const s = await client.getStatus();
  console.log(`Network: ${s.network}`);
  console.log(`Last round: ${s.lastRound}`);
}

function keygen(): void {
  const account = algosdk.generateAccount();
  const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
  console.log(`Address:  ${account.addr}`);
  console.log(`Mnemonic: ${mnemonic}`);
  console.log('\nSave the mnemonic securely. Set ALGOCHAT_MNEMONIC to use it.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'send':
      if (args.length < 3) {
        console.error('Usage: algochat send <recipient> <message>');
        process.exit(1);
      }
      await send(args[1], args.slice(2).join(' '));
      break;

    case 'read':
      await read(args[1]);
      break;

    case 'balance':
      await balance(args[1]);
      break;

    case 'status':
      await status();
      break;

    case 'keygen':
      keygen();
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
