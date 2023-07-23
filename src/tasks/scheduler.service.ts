import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getResource } from '../utils/ipfsStorage';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron() {
    const data = await getResource('users');
    console.log(data);
    this.logger.debug('Called every 5 seconds');
  }
}