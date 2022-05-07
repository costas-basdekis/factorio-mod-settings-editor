export function translateModText(text, modName, modSettingsData, locale) {
  if (!modSettingsData) {
    return text;
  }
  if (!locale) {
    return text;
  }
  const localeSettingData = modSettingsData.modLocales[locale];
  if (!localeSettingData) {
    return text;
  }
  const settingData = localeSettingData.settings[text.toLowerCase()];
  if (!settingData) {
    return text;
  }
  const modSettingData = settingData.by_mod[modName];
  if (!modSettingData || !modSettingData.label) {
    return text;
  }
  return modSettingData.label;
}

export function translateModDescription(text, modName, modSettingsData, locale) {
  if (!modSettingsData) {
    return null;
  }
  if (!locale) {
    return null;
  }
  const localeSettingData = modSettingsData.modLocales[locale];
  if (!localeSettingData) {
    return null;
  }
  const settingData = localeSettingData.settings[text.toLowerCase()];
  if (!settingData) {
    return null;
  }
  const modSettingData = settingData.by_mod[modName];
  if (!modSettingData || !modSettingData.description) {
    return null;
  }
  return modSettingData.description;
}

export function translateCoreText(text, modSettingsData, locale) {
  if (!modSettingsData) {
    return text;
  }
  if (!locale) {
    return text;
  }
  const localeData = modSettingsData.core[locale];
  if (!localeData) {
    return text;
  }
  if (!localeData[text]) {
    return text;
  }
  return localeData[text];
}
