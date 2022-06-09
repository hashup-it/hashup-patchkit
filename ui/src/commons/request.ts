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
    url: `${config.endpoint}/upload`,
    data: {
      total_size_bytes: widgetData.archive!.size,
    }
  }, callbacks) as Promise<string>;
}

export const requestCreateApp = ({ widgetData, appName }: { widgetData: WidgetData, appName: string }, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${config.endpoint}/createApp`,
    data: {
      name: appName,
      platform: decodePlatform(widgetData.platform!),
    },
  }, callbacks) as Promise<string>;
}

export const requestProcess = (widgetData: WidgetData, callbacks?: Callbacks) => {
  return sendRequest({
    method: 'GET',
    url: `${config.endpoint}/process`,
    data: {
      app_secret: widgetData.appSecret,
      version_id: widgetData.versionId,
      upload_id: widgetData.uploadId
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
    url: `${config.endpoint}/publish`,
    data: {
      app_secret: widgetData.appSecret,
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
    url: `${config.endpoint}/fetchApp`,
    data: {
      app_secret: widgetData.appSecret,
    }
  }, callbacks) as Promise<string>;
}
