import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';
import { ServiceAccount } from "firebase-admin";

async function bootstrap() {
  const adminConfig: ServiceAccount = {
    "projectId": process.env.PROJECT_ID,
    "privateKey": process.env.PRIVATE_KEY,
    "clientEmail": process.env.CLIENT_EMAIL,
    };
  if (!admin.apps.length){
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
      databaseURL: process.env.DB_URL
    });
  }
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(5000);
}
bootstrap();
