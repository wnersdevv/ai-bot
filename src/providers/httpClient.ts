import axios, { AxiosInstance } from 'axios';
import { ProviderError } from './types';

/**
 * Thin axios wrapper shared by every provider adapter.
 * Centralizes timeout handling + error normalization so each adapter file
 * stays focused on request/response shape only.
 */
export function createProviderHttpClient(
  providerId: string,
  baseURL: string,
  timeoutMs = 30_000,
): AxiosInstance {
  const client = axios.create({ baseURL, timeout: timeoutMs });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      const retryable =
        !status || status === 429 || status === 408 || status >= 500;
      throw new ProviderError(
        err?.response?.data?.error?.message || err.message || 'Provider request failed',
        providerId,
        retryable,
        status,
        err,
      );
    },
  );

  return client;
}
