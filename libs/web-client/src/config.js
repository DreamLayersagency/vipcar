/**
 * Runtime configuration injected by each frontend at startup, so this package
 * never reads bundler-specific globals such as `import.meta.env`.
 */
const config = {
  apiBaseUrl: '',
  gaMeasurementId: '',
};

/**
 * @param {{ apiBaseUrl?: string, gaMeasurementId?: string }} options
 */
export function configureClient(options = {}) {
  if (options.apiBaseUrl !== undefined) {
    config.apiBaseUrl = String(options.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  }
  if (options.gaMeasurementId !== undefined) {
    config.gaMeasurementId = String(options.gaMeasurementId ?? '').trim();
  }
}

export function getClientConfig() {
  return { ...config };
}
