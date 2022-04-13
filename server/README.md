## Local testing
`$ npm run start`

## Deploy
`$ npm run deploy`

### Configuration
Create `.env` file based on `.env.sample`

### Requirements
- Serverless framework - `$ npm i -g serverless`
- AWS credentials (aws-sdk) & profile - see here https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html#cli-configure-profiles-create

### Known bugs
- Looks like while running locally after every request there is need to re-run (or you get 404 not found)
