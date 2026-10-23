import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { loadLocalEnv, readConfig } from './config';

loadLocalEnv();

async function bootstrap(): Promise<void> {
  const config = readConfig(process.env);
  const app = await NestFactory.create(AppModule);
  const http = app.getHttpAdapter().getInstance();
  http.disable('x-powered-by');
  http.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.frontendOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
