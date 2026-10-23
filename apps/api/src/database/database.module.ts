import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config.module';
import { DatabaseService } from './database.service';

@Module({
  imports: [AppConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
