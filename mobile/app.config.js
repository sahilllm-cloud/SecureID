const localHosts = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '10.0.2.2']);

module.exports = ({ config }) => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  if (buildProfile && buildProfile !== 'development') {
    let apiUrl;
    try {
      apiUrl = new URL(process.env.EXPO_PUBLIC_API_URL);
    } catch {
      throw new Error('Set EXPO_PUBLIC_API_URL to the deployed HTTPS API origin before an EAS release build.');
    }

    const hostname = apiUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (
      apiUrl.protocol !== 'https:' ||
      localHosts.has(hostname) ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.search ||
      apiUrl.hash
    ) {
      throw new Error('EAS release builds require a deployed HTTPS API origin without credentials or local hosts.');
    }
  }

  return config;
};
