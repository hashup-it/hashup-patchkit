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
  const app = await axios.post(
    `${process.env.PK_ENDPOINT}/apps`,
    {
      name: crypto.randomBytes(16).toString("hex"),
      platform: req.query.platform,
      api_key: process.env.API_KEY,
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

export const handler = ServerlessHttp(server);
