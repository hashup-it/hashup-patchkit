export default {
  endpoint: 'https://ogjpkjhe09.execute-api.eu-west-1.amazonaws.com/dev',

  // STAGING environment
  // pkEndpoint: 'https://staging-api.patchkit.net/1',
  // uploadEndpoint: 'https://staging.patchkit.waw.pl/1',

  // PRODUCTION environment
  pkEndpoint: 'https://api2.patchkit.net/1',
  uploadEndpoint: 'https://api.patchkit.net/1',

  maxFileSize: 1073741824 * 100, // 100 GiB
  exeSearchDepth: 2,
  chunkSize: 1048576 * 50, // 50 MiB
  chunkUploadRetries: 0,
}
