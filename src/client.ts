import algosdk from 'algosdk';

export interface AlgoChatConfig {
  algodServer: string;
  algodPort?: number;
  algodToken: string;
  indexerServer: string;
  indexerPort?: number;
  indexerToken: string;
}

export const TESTNET_CONFIG: AlgoChatConfig = {
  algodServer: 'https://testnet-api.algonode.cloud',
  algodToken: '',
  indexerServer: 'https://testnet-idx.algonode.cloud',
  indexerToken: '',
};

export const MAINNET_CONFIG: AlgoChatConfig = {
  algodServer: 'https://mainnet-api.algonode.cloud',
  algodToken: '',
  indexerServer: 'https://mainnet-idx.algonode.cloud',
  indexerToken: '',
};

export interface ChatMessage {
  txid: string;
  sender: string;
  receiver: string;
  content: string;
  round: number;
  timestamp: number;
  amount: number;
}

export class AlgoChatClient {
  private algod: algosdk.Algodv2;
  private indexer: algosdk.Indexer;

  constructor(private config: AlgoChatConfig) {
    this.algod = new algosdk.Algodv2(
      config.algodToken,
      config.algodServer,
      config.algodPort,
    );
    this.indexer = new algosdk.Indexer(
      config.indexerToken,
      config.indexerServer,
      config.indexerPort,
    );
  }

  /** Send a plaintext message (unencrypted, for now). */
  async sendMessage(
    sender: algosdk.Account,
    recipient: string,
    content: string,
    amount: number = 1000,
  ): Promise<string> {
    const params = await this.algod.getTransactionParams().do();
    const note = new TextEncoder().encode(content);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: sender.addr,
      receiver: recipient,
      amount: BigInt(amount),
      note,
      suggestedParams: params,
    });

    const signed = txn.signTxn(sender.sk);
    const { txid } = await this.algod.sendRawTransaction(signed).do();

    await algosdk.waitForConfirmation(this.algod, txid, 4);
    return txid;
  }

  /** Fetch recent messages sent to an address. */
  async getMessages(
    address: string,
    opts: { limit?: number; minRound?: number } = {},
  ): Promise<ChatMessage[]> {
    const limit = opts.limit ?? 50;

    let query = this.indexer
      .searchForTransactions()
      .address(address)
      .addressRole('receiver')
      .limit(limit);

    if (opts.minRound) {
      query = query.minRound(opts.minRound);
    }

    const result = await query.do();
    const messages: ChatMessage[] = [];

    for (const txn of result.transactions ?? []) {
      if (!txn.note) continue;

      try {
        const noteBytes = txn.note instanceof Uint8Array
          ? txn.note
          : new Uint8Array(atob(txn.note as string).split('').map(c => c.charCodeAt(0)));
        const content = new TextDecoder().decode(noteBytes);
        messages.push({
          txid: txn.id ?? '',
          sender: txn.sender,
          receiver: address,
          content,
          round: Number(txn.confirmedRound ?? 0n),
          timestamp: txn.roundTime ?? 0,
          amount: Number(txn.paymentTransaction?.amount ?? 0n),
        });
      } catch {
        // Skip non-text notes
      }
    }

    return messages;
  }

  /** Check account balance. */
  async getBalance(address: string): Promise<bigint> {
    const info = await this.algod.accountInformation(address).do();
    return BigInt(info.amount);
  }

  /** Get current network status. */
  async getStatus(): Promise<{ lastRound: number; network: string }> {
    const status = await this.algod.status().do();
    return {
      lastRound: Number(status.lastRound),
      network: this.config.algodServer.includes('testnet') ? 'testnet' : 'mainnet',
    };
  }
}
