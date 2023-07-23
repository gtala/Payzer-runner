import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

import { ApiUrls, Client } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';

import 'dotenv/config';
import {
  RESOURCE_NAME,
  RPC_URL_MAINNET,
  storeIpfsData,
} from './utils/ipfsStorage';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/test')
  async getHello2(): Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL_MAINNET);
    const wallet = new ethers.Wallet(
      '110a9d5551803630708db04ef5d512cc96af9fa75e31f1d8782a3271cf10452e',
      provider,
    );

    // Create the client with your wallet. This will connect to the XMTP development network by default
    const xmtp = await Client.create(wallet, { apiUrl: ApiUrls.production });
    const conversation = await xmtp.conversations.newConversation(
      '0xa3486e350263fa452c43e31aa85939E3CDa3d552',
    );
    await conversation.send('good nigth');
    return 'test';
  }

  @Get('/save')
  async getHello3(): Promise<string> {
    const toSave = {};
    toSave['0x1cDC2A4fF8d374D91a1161C142cc496FBF5547Ec'] = {
      name: 'guillermo',
      time: 'Sun Jul 23 2023 02:53:05 GMT+0200',
    };
    const data = await storeIpfsData(toSave, RESOURCE_NAME);
    console.log(data);
    return 'test';
  }
}