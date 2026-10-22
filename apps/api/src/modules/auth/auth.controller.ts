import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginRequest,
  MfaVerifyRequest,
  AuthContextUser,
} from '@smartlight/shared-types';
import { Public } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginRequest) {
    return this.authService.login(body);
  }

  @Public()
  @Post('mfa/verify')
  async verifyMfa(@Body() body: MfaVerifyRequest) {
    return this.authService.verifyMfa(body);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: AuthContextUser) {
    return { user };
  }

  @Get('ulbs')
  async getAccessibleUlbs(@CurrentUser() user: AuthContextUser) {
    return this.authService.getAccessibleUlbs(user);
  }

  @Public()
  @Get('accounts')
  async getSeededAccounts() {
    return this.authService.getSeededAccounts();
  }
}
