import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ethers } from 'ethers';
import {
  MetaTransactionData,
  MetaTransactionOptions,
  OperationType,
  RelayTransaction,
} from '@safe-global/safe-core-sdk-types';
import Safe, {
  EthersAdapter,
  getSafeContract,
} from '@safe-global/protocol-kit';
import { GelatoRelayPack } from '@safe-global/relay-kit';
import { DateTime, Duration } from 'luxon';
import { RPC_URL_MAINNET, RPC_URL_TESTNET } from '../utils/ipfsStorage';
import { ApiUrls, Client } from '@xmtp/xmtp-js';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    const currentTime = DateTime.local().toString();
    const scheduleTime = DateTime.local(2023, 7, 23, 5, 51, 0);

    console.log('running time 1', currentTime);

    if (
      scheduleTime.diffNow() > Duration.fromMillis(100) &&
      scheduleTime.diffNow() < Duration.fromMillis(10000)
    ) {
      console.log('running time 2', currentTime);
      const destinationAddress = '0xa3486e350263fa452c43e31aa85939E3CDa3d552';
      const amount = '0.008';

      const responseTX = await this.sendTransaction(destinationAddress, amount);
      const message = `You were paid with ${amount} ETH. Check Tx Status at: https://relay.gelato.digital/tasks/status/${responseTX.taskId}`;

      console.log(responseTX);
      await this.sendXMTPMessage(destinationAddress, message);

      console.log('running time 3', currentTime);
    }
  }

  sendTransaction = async (destinationAddress: string, ethAmount: string) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL_TESTNET);
    const signer = new ethers.Wallet(
      process.env.OWNER_1_PRIVATE_KEY!,
      provider,
    );

    const safeAddress = '0xAe25Cd337553c84db2EdE5C689F793130bf524dB'; // Safe from which the transaction will be sent. Replace with your Safe address
    const chainId = 5;
    const withdrawAmount = ethers.utils
      .parseUnits(ethAmount, 'ether')
      .toString();

    // Get Gelato Relay API Key: https://relay.gelato.network/
    const GELATO_RELAY_API_KEY = process.env.GELATO_RELAY_API_KEY!;
    const gasLimit = '100000';

    // Create a transaction object
    const safeTransactionData: MetaTransactionData = {
      to: destinationAddress,
      data: '0x', // leave blank for ETH transfers
      value: withdrawAmount,
      operation: OperationType.Call,
    };

    const options: MetaTransactionOptions = {
      gasLimit,
      isSponsored: true,
    };

    // Create the Protocol and Relay Kits instances
    async function relayTransaction() {
      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      });

      const safeSDK = await Safe.create({
        ethAdapter,
        safeAddress,
      });

      const relayKit = new GelatoRelayPack(GELATO_RELAY_API_KEY);

      // Prepare the transaction
      const safeTransaction = await safeSDK.createTransaction({
        safeTransactionData,
      });

      const signedSafeTx = await safeSDK.signTransaction(safeTransaction);
      const safeSingletonContract = await getSafeContract({
        ethAdapter,
        safeVersion: await safeSDK.getContractVersion(),
      });

      const encodedTx = safeSingletonContract.encode('execTransaction', [
        signedSafeTx.data.to,
        signedSafeTx.data.value,
        signedSafeTx.data.data,
        signedSafeTx.data.operation,
        signedSafeTx.data.safeTxGas,
        signedSafeTx.data.baseGas,
        signedSafeTx.data.gasPrice,
        signedSafeTx.data.gasToken,
        signedSafeTx.data.refundReceiver,
        signedSafeTx.encodedSignatures(),
      ]);

      const relayTransaction: RelayTransaction = {
        target: safeAddress,
        encodedTransaction: encodedTx,
        chainId: chainId,
        options,
      };

      return await relayKit.relayTransaction(relayTransaction);
    }

    const responseTx = await relayTransaction();

    return responseTx;
  };

  sendXMTPMessage = async (peerAddress: string, message: string) => {
    const mainnetProvider = new ethers.providers.JsonRpcProvider(
      RPC_URL_MAINNET,
    );
    const wallet = new ethers.Wallet(
      process.env.XMTP_SENDER_PRIV_KEY!,
      mainnetProvider,
    );

    const xmtp = await Client.create(wallet, { apiUrl: ApiUrls.production });
    const conversation = await xmtp.conversations.newConversation(peerAddress);
    await conversation.send(message);
  };
}