export type EnvironmentVariables = {
  FEATURE_EMAIL_LOGIN: string;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  STRAVA_AUTHORIZATION_ENDPOINT: string;
  STRAVA_TOKEN_ENDPOINT: string;
  STRAVA_REDIRECT_URI: string;
  STRAVA_API_BASE_URL: string;
}

type Environment = keyof EnvironmentVariables;

export function getEnvironment(k: Environment): string {
  if (!Object.keys(process.env).includes(k)) {
    throw new Error(`Environment variable ${k} is not set`);
  }
  return process.env[k] as string;
}