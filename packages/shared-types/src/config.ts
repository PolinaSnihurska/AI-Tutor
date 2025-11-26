export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface ServiceConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  corsOrigins: string[];
}

export type Environment = 'development' | 'staging' | 'production';
