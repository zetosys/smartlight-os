import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '@smartlight/shared-types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const ULB_SCOPED_KEY = 'ulb_scoped';
export const UlbScoped = () => SetMetadata(ULB_SCOPED_KEY, true);

export const IS_PUBLIC_KEY = 'is_public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
