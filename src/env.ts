import { Logger } from './logging';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const SECRET = 'prod/lambdas';

const dotenv = require('dotenv');
const path = require('path');

const envs = ['local', 'development', 'production'];

export async function prepEnvironment() {
  if (!process.env.NODE_ENV) {
    await loadSecrets();
  } else {
    await loadLocalConfig();
  }
}

export async function loadSecrets() {
  const logger = Logger.get('SECRETS');
  logger.info('[LOADING SECRETS]');

  const secretsManager = new SecretsManager();

  try {
    const secret = await secretsManager.getSecretValue({ SecretId: SECRET });
    logger.info('[SECRETS RETRIEVED]', secret);

    if (secret.SecretString) {
      const secretValue = JSON.parse(secret.SecretString);
  
      Object.keys(secretValue).forEach(function (key) {
        process.env[key] = secretValue[key];
      });
    }
    
  } catch (error) {
    logger.error('[SECRETS ERROR]', error);
    throw error;  // Ensure failure is visible and can trigger retries if configured.
  }
  
  if (!process.env.NODE_ENV) {
    logger.info('[ENVIRONMENT]', `[NODE_ENV MISSING]`, '[EXITING]');
    process.exit();
  }

  if (!envs.includes(process.env.NODE_ENV)) {
    logger.info(
      '[ENVIRONMENT]',
      `[INVALID ENV '${process.env.NODE_ENV}']`,
      '[EXITING]'
    );
    process.exit();
  }

  logger.info('[SECRETS LOADED]');
}

export async function loadLocalConfig() {
  const logger = Logger.get('ENV_READER');
  if (process.env.NODE_ENV) {
    const envPath = path.join(__dirname, '..', `.env.${process.env.NODE_ENV}`);
    logger.info(`[LOADING LOCAL CONFIG FROM ${envPath}]`);
    dotenv.config({
      path: envPath
    });
  }
}
