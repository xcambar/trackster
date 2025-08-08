export type EnvironmentVariables = {
  FEATURE_EMAIL_LOGIN: string;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  STRAVA_AUTHORIZATION_ENDPOINT: string;
  STRAVA_TOKEN_ENDPOINT: string;
  STRAVA_REDIRECT_URI: string;
  STRAVA_API_BASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_DB_URL: string;
  COOKIE_SECRET: string;
  TRACKSTER_PRODUCTION: string;
  GRAPHHOPPER_BASE_URL: string;
  GRAPHHOPPER_API_KEY: string;
};

type Environment = keyof EnvironmentVariables;

export function getEnvironment(k: Environment): string {
  if (!Object.keys(process.env).includes(k)) {
    throw new Error(`Environment variable ${k} is not set`);
  }
  return process.env[k] as string;
}
