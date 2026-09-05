import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ArticlesModule } from './articles/articles.module';
import { FaqModule } from './faq/faq.module';
import { HealthController } from './health.controller';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    ArticlesModule,
    FaqModule,
    LegalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
