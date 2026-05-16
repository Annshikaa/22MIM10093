import axios from 'axios';
import { getAuthToken } from './auth';
import { Stack, Level, Package } from './types';

export const Log = async (
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<void> => {
  try {
    const token = await getAuthToken();
    await axios.post(
      'http://4.224.186.213/evaluation-service/logs',
      { stack, level, package: pkg, message },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[${level}] [${stack}/${pkg}] ${message}`);
  } catch (err) {
    console.error('[logger] failed to push log:', err);
  }
};