import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

import 'dotenv/config';
import { getResource, RESOURCE_NAME, storeIpfsData } from './utils/ipfsStorage';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/test')
  async getHello2(): Promise<string> {
    const data = await getResource(RESOURCE_NAME);
    console.log(data);
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