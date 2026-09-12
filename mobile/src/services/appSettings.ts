import AsyncStorage from '@react-native-async-storage/async-storage';

export type CurrencyType = 'COP' | 'USD' | 'EUR' | 'MXN';
export type ColumnLayoutType = '1 columna' | '2 columnas' | '4 columnas';

export interface AppSettings {
  currency: CurrencyType;
  columnLayout: ColumnLayoutType;
  largeUI: boolean;
  videoPreview: boolean;
  watchLaterBtn: boolean;
  autoTranslateTitles: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: 'COP',
  columnLayout: '4 columnas',
  largeUI: false,
  videoPreview: true,
  watchLaterBtn: true,
  autoTranslateTitles: true,
};

const SETTINGS_KEY = '@texxxnopor_app_settings';

export const appSettingsService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.log('[AppSettings] Error reading settings:', e);
    }
    return { ...DEFAULT_APP_SETTINGS };
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.log('[AppSettings] Error saving settings:', e);
      return { ...DEFAULT_APP_SETTINGS, ...settings };
    }
  },
};
