// ─── Country-to-locale / currency mappings ───────────────────────────────────

const countryCurrencyMap = {
  AF: 'AFN',
  PH: 'PHP',
  US: 'USD',
  GB: 'GBP',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  IN: 'INR',
  ID: 'IDR',
  MY: 'MYR',
  TH: 'THB',
  VN: 'VND',
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  NZ: 'NZD',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  // Add more as needed
}

const countryLocaleMap = {
  AF: 'fa-AF',
  PH: 'en-PH',
  US: 'en-US',
  GB: 'en-GB',
  SG: 'en-SG',
  AU: 'en-AU',
  CA: 'en-CA',
  IN: 'en-IN',
  ID: 'id-ID',
  MY: 'ms-MY',
  TH: 'th-TH',
  VN: 'vi-VN',
  JP: 'ja-JP',
  CN: 'zh-CN',
  HK: 'zh-HK',
  NZ: 'en-NZ',
  DE: 'de-DE',
  FR: 'fr-FR',
  ES: 'es-ES',
  IT: 'it-IT',
  NL: 'nl-NL',
  IE: 'en-IE',
  // Add more as needed
}

/**
 * Resolve currency code from an ISO country code.
 * @param {string} countryCode – ISO 3166-1 alpha-2 (e.g. 'PH', 'US')
 * @returns {string|null}
 */
export function getCountryCurrency(countryCode) {
  return countryCurrencyMap[countryCode?.toUpperCase?.()] || null
}

/**
 * Resolve locale string from an ISO country code.
 * @param {string} countryCode – ISO 3166-1 alpha-2 (e.g. 'PH', 'US')
 * @returns {string|null}
 */
export function getCountryLocale(countryCode) {
  return countryLocaleMap[countryCode?.toUpperCase?.()] || null
}

/**
 * Format a number as currency using a country code.
 * @param {number} amount
 * @param {string} countryCode – ISO 3166-1 alpha-2
 * @returns {string}
 */
export function formatCurrency(amount, countryCode) {
  const currency = getCountryCurrency(countryCode) || 'PHP'
  const locale = getCountryLocale(countryCode) || 'en-PH'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`
  }
}

/**
 * Format a date using a country-specific locale.
 * @param {Date|string|number} date
 * @param {string} countryCode – ISO 3166-1 alpha-2
 * @param {object} options – Intl.DateTimeFormatOptions
 * @returns {string}
 */
export function formatDate(date, countryCode, options = {}) {
  const locale = getCountryLocale(countryCode) || 'en-PH'
  const d = date instanceof Date ? date : new Date(date)
  try {
    return new Intl.DateTimeFormat(locale, options).format(d)
  } catch {
    return d.toISOString().split('T')[0]
  }
}
