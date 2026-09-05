import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
})
export class AuthModule {}
