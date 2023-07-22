import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ethers } from 'ethers';
import { GelatoRelayPack } from '@safe-global/relay-kit';

import 'dotenv/config';

import Safe, {
  EthersAdapter,
  getSafeContract,
} from '@safe-global/protocol-kit';
import {
  MetaTransactionData,
  MetaTransactionOptions,
  OperationType,
  RelayTransaction,
} from '@safe-global/safe-core-sdk-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://eth-goerli.g.alchemy.com/v2/kPwTCNJhRpsvXxPHQg1b40CPT7KT-M5A',
    );
    const signer = new ethers.Wallet(
      process.env.OWNER_1_PRIVATE_KEY!,
      provider,
    );

    const safeAddress = '0xAe25Cd337553c84db2EdE5C689F793130bf524dB'; // Safe from which the transaction will be sent. Replace with your Safe address
    const chainId = 5;

    // Any address can be used for destination. In this example, we use vitalik.eth
    const destinationAddress = '0x9096fF57d3B6Ab870F75de9800E90C4a44Ad5178';
    const withdrawAmount = ethers.utils
      .parseUnits('0.0005', 'ether')
      .toString();

    // Get Gelato Relay API Key: https://relay.gelato.network/
    const GELATO_RELAY_API_KEY = process.env.GELATO_RELAY_API_KEY!;

    // Usually a limit of 21000 is used but for smart contract interactions, you can increase to 100000 because of the more complex interactions.
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

    return this.appService.getHello();
  }
}