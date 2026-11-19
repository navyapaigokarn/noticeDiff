import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '@/services/settings.service';
import type { AppSettings } from '@/types/settings.types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSettings()
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch(() => {
        if (active) setError('Settings could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onChanged = () => {
      void getSettings().then((value) => {
        if (active) setSettings(value);
      });
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  async function update(patch: Partial<AppSettings>): Promise<void> {
    setError(null);
    try {
      setSettings(await saveSettings(patch));
    } catch {
      setError('Settings could not be saved.');
    }
  }

  return { settings, loading, error, update };
}
