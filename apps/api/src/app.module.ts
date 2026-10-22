import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { configuration } from './common/config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { OrganizationModule } from './modules/organizations/organizations.module';
import { AssetModule } from './modules/assets/assets.module';
import { DeviceModule } from './modules/devices/devices.module';
import { CommandModule } from './modules/commands/commands.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { AuditModule } from './modules/audit/audit.module';

import { AuthGuard } from './common/guards/auth.guard';
import { UlbScopeGuard } from './common/guards/ulb-scope.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    AssetModule,
    DeviceModule,
    CommandModule,
    TelemetryModule,
    SimulatorModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: UlbScopeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
