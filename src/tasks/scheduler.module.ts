import { Module } from '@nestjs/common';
import { TasksService } from './scheduler.service';

@Module({
  providers: [TasksService],
})
export class TasksModule {}
