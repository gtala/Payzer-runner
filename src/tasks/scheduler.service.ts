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

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    const currentTime = DateTime.local().toString();
    const scheduleTime = DateTime.local(2023, 7, 23, 4, 3, 0);

    console.log(
      'running time 1',
      currentTime,
      scheduleTime.diffNow().toString(),
    );
    if (
      scheduleTime.diffNow() > Duration.fromMillis(100) &&
      scheduleTime.diffNow() < Duration.fromMillis(10000)
    ) {
      console.log('running time 2', currentTime);
      this.sendTransaction(
        '0x980003F1361083f7BB21aAa74E0B19fe98bB84A8',
        '0.005',
      );
      console.log('running time 3', currentTime);
    }

    this.logger.debug('Called every 20 seconds');
  }

  sendTransaction = (destinationAddress: string, ethAmount: string) => {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://eth-goerli.g.alchemy.com/v2/kPwTCNJhRpsvXxPHQg1b40CPT7KT-M5A',
    );
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

      const response = await relayKit.relayTransaction(relayTransaction);

      console.log(
        `Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response.taskId}`,
      );
    }

    relayTransaction();
  };
}