import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import dns from 'dns';
import { AppModule } from './app.module';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnv } from './common/validate-env';

dotenv.config();
validateEnv();

dns.setServers(['8.8.8.8', '1.1.1.1', '208.67.222.222']);
const origLookup = dns.lookup;
dns.lookup = ((hostname: string, options: any, callback?: any) => {
  if (typeof options === 'function') { callback = options; options = 0; }
  if (typeof callback !== 'function') {
    return origLookup(hostname, options, callback);
  }
  dns.resolve4(hostname, (err: any, addresses?: string[]) => {
    if (err || !addresses?.length) return origLookup(hostname, options, callback);
    if (options && (options as any).all) {
      callback(null, addresses.map((a) => ({ address: a, family: 4 })));
    } else {
      callback(null, addresses[0], 4);
    }
  });
}) as typeof dns.lookup;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    enabled: !!process.env.SENTRY_DSN,
  });

  app.use(helmet({
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://openrouter.ai', 'https://res.cloudinary.com'],
        fontSrc: ["'self'", 'data:'],
        frameSrc: ["'self'", 'https://accounts.google.com'],
        objectSrc: ["'none'"],
      },
    },
  }));
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.CLIENT_URL, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Folio API')
      .setDescription('Portfolio analysis platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
