import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../server/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseTransformInterceptor } from '../server/src/common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from '../server/src/common/filters/all-exceptions.filter';
import express from 'express';

dotenv.config({ path: 'server/.env' });

const app = express();

async function bootstrap() {
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(app));

  nestApp.setGlobalPrefix('api');
  nestApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  nestApp.useGlobalInterceptors(new ResponseTransformInterceptor());
  nestApp.useGlobalFilters(new AllExceptionsFilter());
  nestApp.enableCors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  });

  await nestApp.init();
}

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    await bootstrap();
    initialized = true;
  }
  return app(req, res);
}
