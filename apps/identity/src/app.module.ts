import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { CorporateAccountsModule } from './corporate/corporate-accounts.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(process.cwd(), '.env')],
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-only-change-me'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
        } as { expiresIn: `${number}m` },
      }),
    }),
    AuthModule,
    CorporateAccountsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
