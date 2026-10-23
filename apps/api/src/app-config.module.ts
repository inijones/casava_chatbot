import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import fs from 'node:fs';
import { APP_CONFIG, envFileCandidates, loadLocalEnv, readConfig } from './config';

loadLocalEnv();

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFileCandidates().filter((file) => fs.existsSync(file)),
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => readConfig(process.env),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
