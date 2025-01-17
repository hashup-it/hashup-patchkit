import config from './config';
import { decodePlatform } from './utils';
import {WidgetData} from "../models/widgetData.interface";
import {Callbacks} from "../models/callbacks.interface";

export const sendRequest = ({ method, url, data = '', headers, async = true }: any, { success, error, progress }: Callbacks = {}) => {
  return new Promise((resolve: any) => {
    if (method === 'GET') {
      if (typeof(data) === 'string') url += data;
      else if (typeof(data) === 'object') Object.keys(data).forEach((key, i) => url += `${i === 0 ? '?' : '&'}${key}=${data[key]}`);
      data = '';
    }

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, async);
    headers && Object.keys(headers).forEach((key) => xhr.setRequestHeader(key, headers[key]));

    xhr.addEventListener('load', () => {
      resolve(xhr.response);
      if (xhr.status >= 200 && xhr.status <= 299) success && success(xhr.response);
      else error && error(xhr.response)
    });
    xhr.addEventListener('error', () => {
      resolve(null);
      error && error(xhr.response)
    });
    xhr.upload.addEventListener('progress', (e) => progress && progress(e));

    xhr.send(data);
  })
}
export const requestUpload = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/upload`,
    data: {
      total_size_bytes: widgetData.archive!.size,
    }
  }, callbacks) as Promise<string>;
}

export const requestPatchkitApps = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${config.appCatalogPkEndpoint}/catalogs/${config.appCatalogId}/apps/${widgetData.appCatalogAppId}/patchkit_apps`,
  }, callbacks) as Promise<string>;
}

export const requestCreateApp = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/createApp`,
    data: {
      app_catalog_app_id: widgetData.appCatalogAppId,
      app_name: widgetData.appName,
      icon_url: widgetData.iconUrl,
      token_id: widgetData.tokenId,
      platform: decodePlatform(widgetData.platform!),
      auth_message: widgetData.authMessage,
      auth_signature: widgetData.authSignature,
    },
  }, callbacks) as Promise<string>;
}

export const requestUpdateApp = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/updateApp`,
    data: {
      app_catalog_app_id: widgetData.appCatalogAppId,
      app_secret: widgetData.appSecret,
      auth_message: widgetData.authMessage,
      auth_signature: widgetData.authSignature,
    },
  }, callbacks) as Promise<string>;
}

export const requestProcess = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/process`,
    data: {
      app_secret: widgetData.appSecret,
      version_id: widgetData.versionId,
      upload_id: widgetData.uploadId,
      // moralis_eth: widgetData.moralisEth,
    },
  }, callbacks) as Promise<string>;
}

export const requestProcessingStatus = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${config.pkEndpoint}/background_jobs/${widgetData.jobId}`,
    headers: {
      ['Cache-Control']: 'max-age=0',
    }
  }, callbacks);
}

export const requestPublish = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/publish`,
    data: {
      app_secret: widgetData.appSecret,
      version_id: widgetData.versionId,
      // moralis_eth: widgetData.moralisEth,
    }
  }, callbacks);
}

export const requestPublishingStatus = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${config.pkEndpoint}/apps/${widgetData.appSecret}/versions/1`,
    headers: {
      ['Cache-Control']: 'max-age=0',
    }
  }, callbacks);
}

export const requestFetchApp = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${widgetData.endpoint}/fetchApp`,
    data: {
      app_secret: widgetData.appSecret,
    }
  }, callbacks) as Promise<string>;
}
