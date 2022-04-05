import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { protobufPackage } from './order/proto/order.pb';

async function bootstrap() {
  const app: INestMicroservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:10052',
        package: protobufPackage,
        protoPath: join('node_modules/grpc-proto/proto/order.proto'),
      },
    });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen();
}

bootstrap();
