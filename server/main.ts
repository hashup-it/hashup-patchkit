import 'source-map-support/register';
import express, { Request, Response } from 'express';
import axios from "axios";
import Moralis from 'moralis/node';

import * as ServerlessHttp from 'serverless-http';
import * as cors from 'cors';
import * as crypto from "crypto";
import {ethers} from "ethers";

const server = express();
server.use(cors());

server.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}...`);
});

server.get('/upload', async (req: Request, res: Response) => {
  try {
      console.warn('bbbb')
      const upload = await axios.post(
          `${process.env.PK_ENDPOINT}/uploads`,
          {
              total_size_bytes: req.query.total_size_bytes,
              storage_type: 'local',
              api_key: process.env.API_KEY,
          }
      );
      console.warn('after upload');
      const token = await axios.post(
          `${process.env.PK_ENDPOINT}/uploads/${upload.data.id}/token`,
          { api_key: process.env.API_KEY }
      );
      console.warn('after token');
      const data = {
          upload_id: upload.data.id,
          jwt: token.data.jwt
      };
      console.warn(data);

      res.send(JSON.stringify(data));
  } catch (e) {
      console.error('error', e);
      res.send(JSON.stringify(e))
  }
});

server.get('/createApp', async (req: Request, res: Response) => {
    const tokenId = req.query.token_id.toLowerCase();
    const verifySigner = ethers.utils.recoverAddress(req.query.auth_message, req.query.auth_signature);

    await Moralis.start({ serverUrl: process.env.MORALIS_SERVER_URL, appId: process.env.MORALIS_APP_ID, masterKey: process.env.MORALIS_MASTER_KEY });
    const query = new Moralis.Query("Games");
    query.equalTo("address", tokenId);
    const results = await query.find();
    console.warn(results[0].get('creator'), verifySigner.toLowerCase());

    if (results[0].get('creator') !== verifySigner.toLowerCase()) {
        res.send(JSON.stringify('Not permitted!'));
    }

    try {
        const appName = `${req.query.app_name || ''}-${crypto.randomBytes(16).toString("hex")}`;

        await Moralis.start({ serverUrl: process.env.MORALIS_SERVER_URL, appId: process.env.MORALIS_APP_ID, masterKey: process.env.MORALIS_MASTER_KEY });
        console.warn('after init moralis')

        const createAppCatalogApp = async () => {
            // create appCatalogApp
            const { data: { id } } = await axios.post(
                `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps`,
                {
                    name: appName,
                    display_name: req.query.app_name,
                    visibility: 'public',
                },
                {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': process.env.APPCATALOG_API_KEY,
                    }
                }
            );
            console.warn('after create app in catalog', `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${id}/patchkit_apps`)
            return id;
        }

        const appCatalogAppId = req.query.app_catalog_app_id || await createAppCatalogApp();

        const app = await axios.post(
            `${process.env.PK_ENDPOINT}/apps`,
            {
                name: appName,
                platform: req.query.platform,
                api_key: process.env.API_KEY,
                authentication_method: 'token',
                // visibility: 'public',
            },
        );
        console.warn('after create app', `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps`, `platform=${req.query.platform}&secret=${app.data.secret}`)

        // assign app to appCatalogApp
        await axios.post(
            `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${appCatalogAppId}/patchkit_apps`,
            `platform=${req.query.platform}&secret=${app.data.secret}`,
            {
                headers: {
                    method: 'POST',
                    'X-Api-Key': process.env.APPCATALOG_API_KEY,
                }
            }
        );
        console.warn('after assign to app catalog')

        // add token_id to metadata
        await axios.post(
            `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${appCatalogAppId}/custom_field_values`,
            {
                'custom_field_type_id': process.env.CUSTOM_FIELD_TOKEN_ID,
                value: tokenId,
            },
            {
                headers: {
                    method: 'POST',
                    'X-Api-Key': process.env.APPCATALOG_API_KEY,
                }
            }
        );
        console.warn('after token metadata update')

        // add icon_url to metadata
        await axios.post(
            `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${appCatalogAppId}/custom_field_values`,
            {
                'custom_field_type_id': process.env.CUSTOM_FIELD_ICON_URL,
                value: req.query.icon_url,
            },
            {
                headers: {
                    method: 'POST',
                    'X-Api-Key': process.env.APPCATALOG_API_KEY,
                }
            }
        );
        console.warn('after icon url metadata update')

        // create version
        const version = await axios.post(
            `${process.env.PK_ENDPOINT}/apps/${app.data.secret}/versions`,
            {
                label: '1.0',
                api_key: process.env.API_KEY,
            }
        );
        console.warn('after version post')

        await Moralis.Cloud.run("updatePatchkitAppId", { tokenId, appId: appCatalogAppId }, { useMasterKey: true })
        console.warn('after update patchkit app id')

        res.send(JSON.stringify({
            app_catalog_app_id: appCatalogAppId,
            app_secret: app.data.secret,
            version_id: version.data.id,
        }));
    } catch (e) {
        console.error(e);
        res.send(JSON.stringify(e));
    }
});

const requestDraft = async ({ app_secret }) => {
    try {
        return await axios.get(
            `${process.env.PK_ENDPOINT}/apps/${app_secret}/versions/draft?api_key=${process.env.API_KEY}`,
            {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        );
    } catch (e) {
        console.error(e);
        return e.response;
    }
}

server.get('/updateapp', async (req: Request, res: Response) => {
    const verifySigner = ethers.utils.recoverAddress(req.query.auth_message, req.query.auth_signature);

    await Moralis.start({ serverUrl: process.env.MORALIS_SERVER_URL, appId: process.env.MORALIS_APP_ID, masterKey: process.env.MORALIS_MASTER_KEY });
    const query = new Moralis.Query("Games");
    query.equalTo("patchkitAppId", req.query.app_catalog_app_id)
    const results = await query.find();

    if (results[0].get('creator') !== verifySigner.toLowerCase()) {
        res.send(JSON.stringify('Not permitted!'));
    }

    const lastPublishedVersion = await axios.get(
        `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}/versions/latest?api_key=${process.env.API_KEY}`,
        {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        }
    );

    const draft = await requestDraft({ app_secret: req.query.app_secret });

    console.warn('updateApp: after get', lastPublishedVersion, draft)

    if (draft.status === 200) {
        res.send(JSON.stringify({
            app_secret: req.query.app_secret,
            version_id: draft.data.id,
        }));
    } else {
        const newVersion = +lastPublishedVersion.data.id + 1;

        const version = await axios.post(
            `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}/versions`,
            {
                label: `${newVersion}.0`,
                api_key: process.env.API_KEY,
            }
        );
        console.warn('updateApp: after create version', version, newVersion)

        res.send(JSON.stringify({
            app_catalog_app_id: req.query.app_catalog_app_id,
            app_secret: req.query.app_secret,
            version_id: version.data.id,
        }));
    }
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
    `${process.env.PK_ENDPOINT}/apps/${req.query.app_secret}/versions/${req.query.version_id || '1'}/publish`,
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

// server.get('/metadata', async (req: Request, res: Response) => {
//    const tokenUpdate = await axios.post(
//         `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${req.query.appCatalogAppId}/custom_field_values`,
//         {
//             'custom_field_type_id': process.env.CUSTOM_FIELD_ICON_URL,
//             value: req.query.token_id,
//         },
//         {
//             headers: {
//                 method: 'POST',
//                 'X-Api-Key': process.env.APPCATALOG_API_KEY,
//             }
//         }
//     );
//
//     const iconUpdate = await axios.post(
//         `${process.env.APPCATALOG_PK_ENDPOINT}/catalogs/${process.env.APPCATALOG_CATALOG_ID}/apps/${req.query.appCatalogAppId}/custom_field_values`,
//         {
//             'custom_field_type_id': process.env.CUSTOM_FIELD_ICON_URL,
//             value: req.query.icon_url,
//         },
//         {
//             headers: {
//                 method: 'POST',
//                 'X-Api-Key': process.env.APPCATALOG_API_KEY,
//             }
//         }
//     );
//
//     res.send(JSON.stringify({
//         tokenUpdate: tokenUpdate.data,
//         iconUpdate: iconUpdate.data,
//     }));
// });

export const handler = ServerlessHttp(server);
