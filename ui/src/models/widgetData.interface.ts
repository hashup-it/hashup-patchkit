export interface WidgetData {
    appCatalogAppId?: string;
    archive?: File;
    jwt?: string;
    jobId?: string;
    appSecret?: string;
    versionId?: string;
    uploadId?: string;
    platform?: 'win32' | 'win64' | 'lin32' | 'lin64' | 'osx';
    endpoint?: string;
    appName?: string;
    iconUrl?: string;
    tokenId?: string;
    authSignature?: string;
    authMessage?: string;
}
