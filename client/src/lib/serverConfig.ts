import { useEffect, useState } from 'react';
import { api } from './api';

export interface ServerConfig {
  demoMode: boolean;
  otp: { configured: boolean; channel: string };
  email: { configured: boolean };
  sms: { configured: boolean };
  map: { configured: boolean; provider: string | null };
  verification: { configured: boolean; provider: string | null };
  storage: { configured: boolean; provider: string };
  ai: { configured: boolean; provider: string | null };
}

const FALLBACK: ServerConfig = {
  demoMode: true,
  otp: { configured: false, channel: 'none' },
  email: { configured: false },
  sms: { configured: false },
  map: { configured: false, provider: null },
  verification: { configured: false, provider: null },
  storage: { configured: false, provider: 'local-private' },
  ai: { configured: false, provider: null },
};

let cached: ServerConfig | null = null;
let pending: Promise<ServerConfig> | null = null;

export async function getServerConfig(): Promise<ServerConfig> {
  if (cached) return cached;
  if (!pending) {
    pending = api
      .get<ServerConfig>('/api/config')
      .then((config) => {
        cached = { ...FALLBACK, ...config };
        return cached;
      })
      .catch(() => {
        pending = null;
        return FALLBACK;
      });
  }
  return pending;
}

export function useServerConfig(): { config: ServerConfig; loading: boolean } {
  const [config, setConfig] = useState<ServerConfig>(cached ?? FALLBACK);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    void getServerConfig().then((value) => {
      if (!cancelled) {
        setConfig(value);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
