export interface AppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  databaseUrl: string;
  redisUrl: string;
  mqttUrl: string;
  simulatorEnabled: boolean;
  logLevel: string;
}

export const configuration = (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV;
  const port = parseInt(process.env.PORT ?? '4000', 10);
  const jwtSecret =
    process.env.JWT_SECRET ?? 'dev-jwt-secret-smartlight-os-do-not-use-in-production-2026';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '24h';
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://smartlight:local_dev_secret_2026@localhost:5432/smartlight';
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const mqttUrl = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
  const simulatorEnabled = process.env.SIMULATOR_ENABLED !== 'false';
  const logLevel = process.env.LOG_LEVEL ?? 'debug';

  return {
    nodeEnv,
    port,
    jwtSecret,
    jwtExpiresIn,
    databaseUrl,
    redisUrl,
    mqttUrl,
    simulatorEnabled,
    logLevel,
  };
};
