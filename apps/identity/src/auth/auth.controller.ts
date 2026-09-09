import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  LoginDto,
  LogoutDto,
  NATS_PATTERNS,
  RefreshDto,
  RegisterDto,
  CreateStaffUserDto,
} from '@vipcar/contracts';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(NATS_PATTERNS.identity.health)
  health() {
    return { status: 'ok', service: 'identity' };
  }

  @MessagePattern(NATS_PATTERNS.identity.register)
  register(@Payload() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @MessagePattern(NATS_PATTERNS.identity.login)
  login(@Payload() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @MessagePattern(NATS_PATTERNS.identity.admin.staffUserCreate)
  createStaff(@Payload() dto: CreateStaffUserDto) {
    return this.auth.createStaff(dto);
  }

  @MessagePattern(NATS_PATTERNS.identity.admin.staffUserList)
  listStaff() {
    return this.auth.listStaff();
  }

  @MessagePattern(NATS_PATTERNS.identity.refresh)
  refresh(@Payload() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @MessagePattern(NATS_PATTERNS.identity.logout)
  logout(@Payload() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @MessagePattern(NATS_PATTERNS.identity.me)
  me(@Payload() data: { userId: string }) {
    return this.auth.me(data.userId);
  }
}
