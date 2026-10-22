import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  AuthContextUser,
} from '@smartlight/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.manage')
  listUsers(@CurrentUser() user: AuthContextUser) {
    return this.usersService.listUsers(user);
  }

  @Get('roles/matrix')
  getRolePermissionsMatrix() {
    return this.usersService.getRolePermissionsMatrix();
  }

  @Get(':id')
  @RequirePermissions('users.manage')
  getUserById(@Param('id') id: string, @CurrentUser() user: AuthContextUser) {
    return this.usersService.getUserById(id, user);
  }

  @Post()
  @RequirePermissions('users.manage')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthContextUser) {
    return this.usersService.createUser(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.usersService.updateUser(id, dto, user);
  }

  @Post(':id/toggle-active')
  @RequirePermissions('users.manage')
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: AuthContextUser,
  ) {
    return this.usersService.toggleActive(id, user);
  }

  @Post(':id/toggle-mfa')
  @RequirePermissions('users.manage')
  toggleMfa(@Param('id') id: string, @CurrentUser() user: AuthContextUser) {
    return this.usersService.toggleMfa(id, user);
  }
}
