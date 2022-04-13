import {LitElement, html, css, PropertyValues} from 'lit';
import {customElement} from 'lit/decorators.js';

import { requestUpload, requestCreateApp, requestProcess, requestProcessingStatus, requestPublish, requestPublishingStatus, requestFetchApp } from './commons/request';
import { getEntriesFromZip, validateZip, recognizePlatform, setUploadData, chunkedFileUpload, bitSizeToMB } from './commons/utils';
import {WidgetData} from "./models/widgetData.interface";
import {ProgressData} from "./models/progressData.interface";

const  widgetData: WidgetData = {
    archive: undefined,
    uploadId: undefined,
    jwt: undefined,
    platform: undefined,
    appSecret: undefined,
};

@customElement('hashup-game-uploader')
export class HashupGameUploader extends LitElement {
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

    // @ TODO type
    onFileChange = async (e: any) => {
        if (!e.target.files[0]) return;

        widgetData.archive = e.target.files[0];

        console.log('🔹Archive chosen'); // *
        console.table(widgetData.archive);

        console.log('🔹Request upload'); // *
        const upload = await requestUpload(widgetData);
        if (!upload) return;

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
            console.warn(errorMessage);
            return;
        }

        console.log('🔹Detect platforms and create an exe list'); // *
        const exeArr = await recognizePlatform(archiveEntries);
        if (exeArr.length === 0) console.warn('No executable found in given archive');
        if (!exeArr || exeArr.length === 0) return;
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
                error: (e: any) => console.error('Error while file uploading', e)
            });
        }

        const onFileUploaded = async () => {
            console.log('OK');

            console.log('🔹Request createApp'); // *
            const newApp = await requestCreateApp(widgetData, {
                error: () => console.warn('Error while creating the application')
            });
            if (!newApp) return;

            const newAppData = JSON.parse(newApp);
            console.table(newAppData);

            widgetData.appSecret = newAppData.app_secret;
            widgetData.versionId = newAppData.version_id;

            console.log('🔹Start processing the file'); // *
            const process = await requestProcess(widgetData, {
                error: () => console.warn('Cannot process the file')
            });
            if (!process) return;

            const processData = JSON.parse(process);
            console.table(processData);

            widgetData.jobId = processData.job_guid;

            await monitorProcessing();

            console.log('🔹Start publishing the application'); // *
            const publish = await requestPublish(widgetData, {
                error: () => console.warn('Error while publishing')
            });
            if (!publish) return;

            await monitorPublishing();

            console.log('🔹Fetch the app data to get the download link'); // *
            const app = await requestFetchApp(widgetData);
            if (!app) return;

            const appData = JSON.parse(app);

            const FileUploaded = new CustomEvent('file-uploaded', {
                detail: appData,
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(FileUploaded);

            console.log('🔹Show the download button'); // *
            this.showDownload(appData.download_links.direct);
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
                        error: () => console.warn('Error while requesting the processing status')
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
                        error: () => console.warn('Error while requesting the processing status')
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
