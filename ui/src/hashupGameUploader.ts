import {LitElement, html, css, PropertyValues} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
    requestUpload,
    requestCreateApp,
    requestProcess,
    requestProcessingStatus,
    requestPublish,
    requestPublishingStatus,
    requestFetchApp,
    requestUpdateApp, requestPatchkitApps
} from './commons/request';
import {
    getEntriesFromZip,
    validateZip,
    recognizePlatform,
    setUploadData,
    chunkedFileUpload,
    bitSizeToMB,
    decodePlatform
} from './commons/utils';
import {WidgetData} from "./models/widgetData.interface";
import {ProgressData} from "./models/progressData.interface";

const  widgetData: WidgetData = {
    archive: undefined,
    uploadId: undefined,
    jwt: undefined,
    platform: undefined,
    appSecret: undefined,
    endpoint: undefined,
    appName: undefined,
    iconUrl: undefined,
    tokenId: undefined,
    authSignature: undefined,
    authMessage: undefined,
};

@customElement('hashup-game-uploader')
export class HashupGameUploader extends LitElement {
    @property({type: String})
    appName = '';

    @property({type: String})
    tokenId = '';

    @property({type: String})
    appCatalogAppId = '';

    @property({type: String})
    iconUrl = '';

    @property({type: String})
    endpoint = '';

    @property({type: String})
    authMessage = ''

    @property({type: String})
    authSignature = ''

    static override styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `;

    override render() {
        return html`<div id="widget"></div>`;
    }

    widgetDiv: any;

    override updated() {
        widgetData.iconUrl = this.iconUrl;
        widgetData.appName = this.appName;
        widgetData.appCatalogAppId = this.appCatalogAppId;
        widgetData.tokenId = this.tokenId;
        widgetData.endpoint = this.endpoint;
        widgetData.authMessage = this.authMessage;
        widgetData.authSignature = this.authSignature;
    }

    protected override firstUpdated(_changedProperties: PropertyValues) {
        super.firstUpdated(_changedProperties);

        this.widgetDiv = this.renderRoot.querySelector('#widget');
        this.widgetDiv.innerHTML = '';

        const fileInput = document.createElement('input');
        this.widgetDiv.appendChild(fileInput);
        fileInput.setAttribute('type', 'file');
        fileInput.onchange = this.onFileChange;
    }

    showProgress = () => {
        this.widgetDiv.innerHTML = '';

        const progressDiv = document.createElement('div');
        this.widgetDiv.appendChild(progressDiv);
        progressDiv.className = 'progress';

        const progressTextDiv = document.createElement('div');
        progressDiv.appendChild(progressTextDiv);

        const progressBarDiv = document.createElement('progress') as any;
        progressDiv.appendChild(progressBarDiv);
        progressBarDiv.setAttribute('min', '0');
        progressBarDiv.setAttribute('max', '100');

        return [ progressDiv, progressTextDiv, progressBarDiv ];
    }

    showDownload = (url: string) => {
        this.widgetDiv.innerHTML = '';

        const downloadButtonDiv = document.createElement('button');
        this.widgetDiv.appendChild(downloadButtonDiv);
        downloadButtonDiv.innerText = 'Download Launcher';
        downloadButtonDiv.onclick = () => window.open(url);
    }

    showSuccess = () => {
        this.widgetDiv.innerHTML = 'Success!';
    }

    // @ TODO type
    onFileChange = async (e: any) => {
        if (!e.target.files[0]) return;

        widgetData.archive = e.target.files[0];

        console.log('🔹Archive chosen'); // *
        console.table(widgetData.archive);

        console.log('🔹Request upload'); // *
        const loading = document.createElement('div');
        loading.innerHTML = 'Loading...'
        this.widgetDiv.appendChild(loading);
        const upload = await requestUpload(widgetData);
        if (!upload) {
            loading.innerHTML = '';
            throw new Error('Error while uploading');
        }

        const uploadData = JSON.parse(upload);
        console.table(uploadData);

        widgetData.uploadId = uploadData.upload_id;
        widgetData.jwt = uploadData.jwt;

        console.log('🔹Validate archive'); // *
        const archiveEntries = await getEntriesFromZip(widgetData.archive);
        const [ isValidated, errorMessage ] = validateZip(widgetData.archive!, archiveEntries);

        if (isValidated) {
            console.info('OK')
        } else {
            loading.innerHTML = 'Incorrect file! Please upload zip. For more information please contact administrator: hello@hashup.it';
            console.error(errorMessage);
            throw new Error('Incorrect file');
        }

        console.log('🔹Detect platforms and create an exe list'); // *
        const exeArr = await recognizePlatform(archiveEntries);
        if (exeArr.length === 0) alert('No executable found in given archive.\nFor more info contact administrator: hello@hashup.it');
        if (!exeArr || exeArr.length === 0) {
            throw new Error('No executable found in given archive');
        }
        console.table(exeArr);

        console.log('🔹Get platforms from the exe list'); // *
        // @ts-ignore
        const platformArr = [...new Set(exeArr.map((exe) => exe.platform))];
        console.table(platformArr);

        // You can
        // if (platformArr.length === 1) onPlatformSelect(platform);
        // and skip the buttons if there is only one detected platform
        console.log('🔹Show buttons to select a platform'); // *
        this.widgetDiv.innerHTML = '';
        const buttonsDiv = document.createElement('div');
        this.widgetDiv.appendChild(buttonsDiv);
        buttonsDiv.className = 'buttons';

        platformArr.forEach((platform) => {
            const buttonDiv = document.createElement('button');
            buttonsDiv.appendChild(buttonDiv);
            buttonDiv.innerText = platform;

            buttonDiv.onclick = () => onPlatformSelect(platform);
        });

        const onPlatformSelect = (platform: 'win32' | 'win64' | 'lin32' | 'lin64' | 'osx') => {
            console.table(platform);

            widgetData.platform = platform;

            console.log('🔹Set upload data'); // *
            const uploadData = setUploadData({
                uploadId: widgetData.uploadId,
                file: widgetData.archive,
                jwt: widgetData.jwt,
            });
            console.table(uploadData);

            console.log('🔹Show uploading progress'); // *
            const [ progressTextDiv, progressBarDiv ] = this.showProgress();

            console.log('🔹Start chunked file upload'); // *
            chunkedFileUpload({
                progress: (progressData: ProgressData) => {
                    progressTextDiv.innerHTML = `
        <p>Uploading</p>
        <p>${bitSizeToMB(progressData.loaded)} / ${bitSizeToMB(progressData.total)} MB</p>
        <p>${progressData.totalPercentComplete}%</p>
        `;
                    progressBarDiv.value = progressData.totalPercentComplete;
                },
                success: onFileUploaded,
                error: (e: any) => {
                    console.error('Error while file uploading', e);
                    throw new Error('Error while uploading');
                }
            });
        }

        const initializeAppWithFirstVersion = async () => {
            const versionData = await requestCreateApp(widgetData, {
                error: () => console.error('Error while creating the application')
            });
            if (!versionData) throw new Error('Error while creating the application');
            return JSON.parse(versionData);
        }

        const retrieveAppSecretKey = async () => {
            const patchkitAppsBody = await requestPatchkitApps(widgetData);
            const patchkitAppsData = JSON.parse(patchkitAppsBody);
            const { patchkit_apps: patchkitApps} = patchkitAppsData;
            const patchkitApp = patchkitApps.find(({ platform }: any) => platform === decodePlatform(widgetData.platform!));
            console.log('platform: ', patchkitApp);
            return patchkitApp?.secret || null;
        }

        const updateExistingAppVersion = async () => {
            const versionData = await requestUpdateApp(widgetData, {
                error: () => console.error('Error while creating the application')
            });
            if (!versionData) throw new Error('Error while creating the application');
            return JSON.parse(versionData);
        }

        const onFileUploaded = async () => {
            console.log('OK');

            console.log('🔹Request createApp'); // *

            widgetData.appSecret = widgetData.appCatalogAppId ? await retrieveAppSecretKey() : null;
            const { app_secret, version_id, app_catalog_app_id } = widgetData.appSecret ? await updateExistingAppVersion() : await initializeAppWithFirstVersion();

            widgetData.appSecret = app_secret;
            widgetData.versionId = version_id;
            widgetData.appCatalogAppId = app_catalog_app_id;

            console.log('🔹Start processing the file'); // *
            const process = await requestProcess(widgetData, {
                error: () => console.error('Cannot process the file')
            });
            if (!process) throw new Error('Cannot process the file');

            const processData = JSON.parse(process);
            console.table(processData);

            widgetData.jobId = processData.job_guid;

            await monitorProcessing();

            console.log('🔹Start publishing the application'); // *
            const publish = await requestPublish(widgetData, {
                error: () => console.error('Error while publishing')
            });
            if (!publish) throw new Error('Error while publishing');

            await monitorPublishing();

            console.log('🔹Fetch the app data to get the download link'); // *
            const app = await requestFetchApp(widgetData);
            if (!app) throw new Error('Error while fetching app data');

            const appData = JSON.parse(app);

            const FileUploaded = new CustomEvent('file-uploaded', {
                detail: {
                    ...appData,
                },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(FileUploaded);

            // console.log('🔹Show the download button'); // *
            // this.showDownload(appData.download_links.direct);

            this.showSuccess();
        }

        const monitorProcessing = () => {
            console.log('🔹Show processing progress'); // *
            const [ progressTextDiv, progressBarDiv ] = this.showProgress();

            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    requestProcessingStatus(widgetData, {
                        success: (r: any) => {
                            const processingStatus = JSON.parse(r);
                            const processingProgress = +processingStatus.progress * 100;

                            progressTextDiv.innerHTML =
                                `
            <p>Processing</p>
            <p>${processingStatus.status_message || ''}</p>
            <p>${processingProgress}%</p>
            `;
                            progressBarDiv.value = processingProgress;

                            if (processingStatus.finished) {
                                clearInterval(interval);
                                resolve(null);
                            }
                        },
                        error: () => {
                            console.error('Error while requesting the processing status');
                            throw new Error('Error while requesting the processing status');
                        }
                    });
                }, 1000);
            });
        }

        const monitorPublishing = () => {
            console.log('🔹Show publishing progress'); // *
            const [ progressTextDiv, progressBarDiv ] = this.showProgress();

            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    requestPublishingStatus(widgetData, {
                        success: (r: any) => {
                            const publishingStatus = JSON.parse(r);
                            const publishingProgress = (publishingStatus.publish_progress * 100).toString();

                            progressTextDiv.innerHTML =
                                `
            <p>Publishing</p>
            <p>${publishingProgress}%</p>
            `;
                            progressBarDiv.value = publishingProgress;

                            if (publishingStatus.publish_progress === 1) {
                                clearInterval(interval);
                                resolve(null);
                            }
                        },
                        error: () => {
                            console.error('Error while requesting the publishing status');
                            throw new Error('Error while requesting the publishing status');
                        }
                    });
                }, 1000);
            });
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'hashup-game-uploader': HashupGameUploader;
    }
}
