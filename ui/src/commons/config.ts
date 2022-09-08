export default {
  // STAGING environment
  // pkEndpoint: 'https://staging-api.patchkit.net/1',
  // uploadEndpoint: 'https://staging.patchkit.waw.pl/1',

  // PRODUCTION environment
  appCatalogPkEndpoint: 'https://app-catalog.patchkit.net/v1',
  appCatalogId: 'b1a6b721-4200-420d-b0c1-1ae15823b65e',
  pkEndpoint: 'https://api2.patchkit.net/1',
  uploadEndpoint: 'https://api.patchkit.net/1',

  maxFileSize: 1073741824 * 100, // 100 GiB
  exeSearchDepth: 2,
  chunkSize: 1048576 * 50, // 50 MiB
  chunkUploadRetries: 0,
}
