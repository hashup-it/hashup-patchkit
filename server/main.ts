import 'source-map-support/register';
import express, { Request, Response } from 'express';
import axios from "axios";

import * as ServerlessHttp from 'serverless-http';
import * as cors from 'cors';
import * as crypto from "crypto";

const server = express();
server.use(cors());

server.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}...`);
});

server.get('/upload', async (req: Request, res: Response) => {
  try {
      console.warn(  `${process.env.PK_ENDPOINT}/uploads`,
          {
              total_size_bytes: req.query.total_size_bytes,
              storage_type: 'local',
              api_key: process.env.API_KEY,
          })
      const upload = await axios.post(
          `${process.env.PK_ENDPOINT}/uploads`,
          {
              total_size_bytes: req.query.total_size_bytes,
              storage_type: 'local',
              api_key: process.env.API_KEY,
          }
      );
      const token = await axios.post(
          `${process.env.PK_ENDPOINT}/uploads/${upload.data.id}/token`,
          { api_key: process.env.API_KEY }
      );

      res.send(JSON.stringify({
          upload_id: upload.data.id,
          jwt: token.data.jwt
      }));
  } catch (e) {
      console.warn(e);
  }
});

server.get('/createApp', async (req: Request, res: Response) => {
  const appName = `${req.query.name || ''}-${crypto.randomBytes(16).toString("hex")}`;
  const app = await axios.post(
    `${process.env.PK_ENDPOINT}/apps`,
    {
      name: appName,
      platform: req.query.platform,
      api_key: process.env.API_KEY,
      authentication_method: 'token'
    }
  );

  // create appCatalogApp
  const appCatalogApp = await axios.post(
    `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps`,
      {
          name: appName,
          display_name: appName
      },
    {
        method: 'POST',
        headers: {
            'X-Api-Key': process.env.APPCATALOG_API_KEY,
        }
    }
  );

  // assign app to appCatalogApp
  await axios.post(
      `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${appCatalogApp.data.id}/patchkit_apps`,
      `platform=${req.query.platform}&secret=${app.data.secret}`,
      {
          headers: {
              method: 'POST',
              'X-Api-Key': process.env.APPCATALOG_API_KEY,
          }
      }
  );

  const version = await axios.post(
    `${process.env.PK_ENDPOINT}/apps/${app.data.secret}/versions`,
    {
      label: '1.0',
      api_key: process.env.API_KEY,
    }
  );

  res.send(JSON.stringify({
    app_catalog_app_id: appCatalogApp.data.id,
    app_secret: app.data.secret,
    version_id: version.data.id,
  }));
});

server.get('/process', async (req: Request, res: Response) => {
  const response = await axios.put(
    `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}/versions/${req.query.version_id}/content_file`,
    {
      api_key: process.env.API_KEY,
      upload_id: req.query.upload_id,
    }
  );

  res.send(JSON.stringify(response.data));
});

server.get('/publish', async (req: Request, res: Response) => {
  const publish = await axios.post(
    `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}/versions/1/publish`,
    {
      api_key: process.env.API_KEY,
    }
  );

  res.send(JSON.stringify(publish.data));
});

server.get('/fetchApp', async (req: Request, res: Response) => {
  const app = await axios.get(
    `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}?api_key=${process.env.API_KEY}`,
    {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );

  res.send(JSON.stringify(app.data));
});

server.get('/metadata', async (req: Request, res: Response) => {
   const tokenUpdate = await axios.post(
        `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${req.query.appCatalogAppId}/custom_field_values`,
        {
            'custom_field_type_id': process.env.CUSTOM_FIELD_ICON_URL,
            value: req.query.tokenId,
        },
        {
            headers: {
                method: 'POST',
                'X-Api-Key': process.env.APPCATALOG_API_KEY,
            }
        }
    );

    const iconUpdate = await axios.post(
        `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${req.query.appCatalogAppId}/custom_field_values`,
        {
            'custom_field_type_id': process.env.CUSTOM_FIELD_ICON_URL,
            value: req.query.iconUrl,
        },
        {
            headers: {
                method: 'POST',
                'X-Api-Key': process.env.APPCATALOG_API_KEY,
            }
        }
    );

    res.send(JSON.stringify({
        tokenUpdate: tokenUpdate.data,
        iconUpdate: iconUpdate.data,
    }));
});

export const handler = ServerlessHttp(server);
