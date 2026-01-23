# Node API

## Code style

To ensure that code is formatted similarly, regardless of who the author is, we use prettier. In order for a formatting commit not to show up in git blame, you can add it to `.git-blame-ignore-revs`

Optionally, you can use prettier before committing, like this:

```shell
npx Prettier . --check # Checks what files might not be correctly formatted
npx Prettier filename.ts --write # Formats filename.ts
npx Prettier . --write # Formats all files
```

or like this:

```shell
echo "npx prettier './**/*.{js,ts,md,json}' -c" >> .git/hooks/pre-commit
chmod ug+x .git/hooks/pre-commit
```

## ENV variables

Put in `.env` for local testing, or set the variables using export, like this

```shell
export MONGODB_URL=mongodb://localhost:27017/arcticsciencehubdb
```

Additionally, when using `docker run`, you can add in `-e MONGODB_URL`

### Mandatory

- `AWS_ACCESS_KEY_ID` - Secret. Used for the SES integration. See Discord for information
- `AWS_SECRET_ACCESS_KEY` - Secret. Used for the SES integration. See Discord for information
- `JWK_PRIVATE` - The private key used to sign verification links. It is not needed to set this, and `JWK_PUBLIC`, as long as the `keys:generate` script is run to generate the `private.jwk` and `public.jwk` files.
- `JWK_PUBLIC` - The public key used to verify verification links. It is not needed to set this, and `JWK_PRIVATE`, as long as the `keys:generate` script is run to generate the `private.jwk` and `public.jwk` files.
- `FRONTEND_BASE_URL` - The location of the front end application. Used to whitelist the request origin and generate confirmation links in email templates.
  - Example: http://localhost:3000
- `MONGODB_URL` - The connection string for the MongoDB database.
  - Example: mongodb://localhost:27017/arcticsciencehubdb
- `SES` - The arn to a SES account which can handle the sending of email notifications
  - format: arn:aws:ses:_zone_:_account_:identity/_email_
  - Example: arn:aws:ses:eu-central-1:999999999999:identity/email@domain.com

As an option to setting JWK_PRIVATE and JWK_PUBLIC environment variables, you can provide .jwk-files. Such files can be generated with the following command:

```shell
npm run keys:generate # Generates 2 files, private.jwk and public.jwk, will serve as private and public keys.
```

Currently, this is included in [dockerfile](/dockerfile).

### Optional

- `ADMIN_EMAIL` - Email to the root administrator user. This user can be used to log in and elevate other users. If both this and `ADMIN_PASSWORD` is set, an administrator user will be created.
- `ADMIN_PASSWORD` - Password to root administrator user. This user can be used to log in and elevate other users. If both this and `ADMIN_EMAIL` is set, an administrator user will be created.
- `DEBUG` - Will enable debug logs if set to `true`
- `EMAIL_VALID_MINUTES` - The amount of minutes the verification email link will still be valid. Defaults to 60.
- `ENVIRONMENT` - What environment to use (for now used for what folder in the bucket to use)
  - Default: `'staging'`
- `KEEP_CONTACTS_DAYS` - The number of days deleted contact persons will be kept before they're permanently deleted.
  - Default: 30
- `KEEP_CONTRACTS_DAYS` - The number of days deleted contracts will be kept before they're permanently deleted.
  - Default: 30
- `KEEP_SUPPLIERS_DAYS` - The number of days deleted suppliers will be kept before they're permanently deleted.
  - Default: 30
- `KEEP_USERS_DAYS` - The number of days deleted users will be kept before they're permanently deleted.
  - Default: 30
- `MAX_REQ_SIZE_MB` - Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Needs to be big since we send in file-data with the request call.
  - Default: 20
- `PORT` - The port to run tha API on.
  - Default: 5000
- `SEARCH_STRING_LENGTH` - The length of allowed search queries (shorter search strings will not be processed)
  - Default: 2
- `SESSION_MAX_MINUTES` - The max age in minutes of the cookie used to keep the user logged in. After this amount of minutes' inactivity, the user will be logged out
  - Default: 30
- `S3_BUCKET` - Ovverride the default bucket.
  - Default: `'arcticsciencehub-agreements'`

## Endpoints

The available endpoints in the API is documented with Swagger, and is available as long as the API is directly available (either on a locally hosted dev server, or with a reachable URL). The URI for the Swagger documentation is `/api/doc`. On a locally hosted dev server, with default port 5000, the full address would then be `http://localhost:5000/api/doc`. While using Swagger to test the endpoints still required authentication, it is probably still wise to block open and direct connections in production environments.

## AWS

The application uses AWS built in services for both sending emails and storing files. Brief description of each below

### S3 (Storage)

Contracts can be stored with file attachments, which is saved to an S3 Bucket, and subsequently a file path reference is added to the contract in the database. By default, the API will target and use a bucket named `'arcticsciencehub-agreements'`, but this can be overridden, using the `S3_BUCKET` environemnt variable. The files stored here are updated and / or deleted through automatic tasks, in accordance with the state of the contracts they belong to.

### SES (Email notifications)

Some of the actions in the application will trigger emails to either get a confirmation, or simply to notify the user, using the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `SES` environment variable to connect. The templates for these emails can be found in the `\templates` directory. Each template has both html and txt versions, and both are in use (since not all emails support markdown language such as clickable links). Both versions should therefor be kept up to date.

The available templates are as follows:

- `delete` - Sent to a user to confirm deleting or deactivating the user account
- `invite` - Sent to a user when being invited to the platform by somebody else
- `notification` - Sent to a user when an administrator makes changes to their account
- `reset` - Sent to a user who requests a password reset
- `verify` - Sent to a user signing up to the platform

These email templates include the use of some variables, one of which being a link used to confirm the email (when signing up / being invited) or verify the action (reseting password or deleting the account). This link is generated based on the mandatory `FRONTEND_BASE_URL` variable (see environment variables)

## Starting a dev environment

If you want to run the api locally for development, you can set it up as a node dev server like this:

```shell
npm install # Install dependencies
echo "MONGODB_URL=mongodb://localhost:27017/arcticsciencehubdb" > .env # Create an .env file
npm run keys:generate # If you don't provide JWK_PRIVATE and JWK_PUBLIC as environment variables
npm run dev:db:create` # Start a mongodb container locally. Docker needs to be installed.
npm run dev` # Starts the application in dev.
```

Or you can run it as a docker container by using provided scripts like this

```shell
npm run dev:db:create
npm dev:docker:run
```

## Cleanup

```shell
npm run dev:db:remove # Delete the mongodb-container locally.
```

## Need help or other information

Please contact the repo owner. We can assist with installation and use.
