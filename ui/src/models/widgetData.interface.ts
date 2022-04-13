export interface WidgetData {
    archive?: File;
    jwt?: string;
    jobId?: string;
    appSecret?: string;
    versionId?: string;
    uploadId?: string;
    platform?: 'win32' | 'win64' | 'lin32' | 'lin64' | 'osx';
}
