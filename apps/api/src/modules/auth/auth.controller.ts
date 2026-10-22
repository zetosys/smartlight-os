import { Controller, Post, Get, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequest, AuthContextUser } from '@smartlight/shared-types';
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
