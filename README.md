# Smart4Health Connector Portal

This is a set of static pages to display the connector iframe. While the iframe is hosted
in the connector outbox (for which one+ instances will be running in each hospital's network), these static pages will
be served from an external location. This means that each version of this portal needs to have a separate
backend URL for the connector.

See the connector service repository and documentation here: https://github.com/smart4health/connector-service

## Build process

We use a custom build process with ts-node that has the following procedure:

1. Static assets (fonts, images, styles) are simply copied to the `build` dir.
2. Javascript files are also copied, but first the CONNECTOR_DOMAIN is string replaced with the backendUrl of the
   profile.
3. The [i18n](compilation/i18n) directory is filtered for any yaml files matching the profile's `mainTemplate`
   and `subTemplate` like this:
    - `<mainTemplate>-<lang>.yaml`
    - `<mainTemplate>-<subTemplate>-<lang>.yaml`
    - Examples: `hospital-de.yaml`, `hospital-name-de.yaml`

   This also implicitly enables which languages are supported.
4. All properties that are in the subTemplate will override the ones from the mainTemplate, so the mainTemplate will
   always be as fallback. These merged language definitions are templated via Mustache to the [html pages](src/pages)
   and the compiled html files provided in a subdirectory named after the language:
    - build/de/$page.html
    - build/en/$page.html
    - build/pt/$page.html
5. The build directory is uploaded to S3 buckets being delivered by CloudFront.

## Local Development

To run the server in development, just run `npm ci && npm start`, which will listen on port 4000. If you want to test
cross-origin usage, edit your `/etc/hosts` file to give yourself a different domain that you could hit the server for
this repo on. Then visit the page at `http://<my-cool-domain>:4000?token=<my-cool-token>&lang=<my-cool-locale>`. For
example, `http://localhost:4000?token=lol123&lang=en_US`. In development, the snippet expects your `outbox-api` to be
running on `localhost:8080`.

To test the full flow, from adding a case to redirecting from the iframe to the success page on a successful PIN, start
both outbox and inbox APIs, as well as the server in this repo.

Then add a case, grab the token, and visit `localhost:4000?token=<TOKEN_HERE>&lang=<LOCALE_HERE>`. At the end, you
should be redirected to a success page or an error page having a `kind` url param that's used to give the user more
error specific suggestions what to do.

As a side note, the `lang` parameter is optional and the server will default to the `application.yaml` (in the
connector `outbox-api` project)'s configured default locale. But if you want to test different locales, you can manually
provide this in the URL, but because it is manually injected into the iframe with javascript, this will only work on the
first page of the iframe.

## Remote deployment

Replace `local` with the desired buildProfile id which is configured in `compilation/profileconfig.json`:

```shell
npm ci
PROFILE=local npm run compile
```

Serve the `build` directory as static content and access `<build-dir>/de/start.html`

## Guides

### On-boarding a new hospital aka profile

Profiles are configured inside `compilation/profileconfig.json`. See the exemplary local one.

Options:

- buildProfile: id of the profile
- mainTemplate: expects the files `compilation/i18n/<mainTemplate>-<lang>.yaml`. Currently, `hospital`
- subTemplate: considers the templates `compilation/i18n/<mainTemplate>-<subTemplate>-<lang>.yaml` if they exist. So
  optional.
- backendUrl: location of the connector service's outbox,
  e.g. [https://api.connect.smart4health.eu](https://api.connect.smart4health.eu)

Check the build with:

```shell
PROFILE=<buildProfile> npm run compile
```

### On-boarding a new language

Add a new file for one/both of the main templates in the [i18n](compilation/i18n) directory with the language tag
as suffix exactly as it is configured in connector outbox (de, en, pt).

### 'kind' query param

#### Error

On error.html redirects the connector adds a query param `kind` that can take the following values:

Common errors with a designated message. `malformed_token` and `expired_token` are not provided with a contact form for
our helpdesk since they are usually the user's "fault".

- `malformed_token`: error on decrypting the `token` query param which means the user didn't copy it properly to the
  browser.
- `expired_token`: when a new invitation email is sent the previous token is invalidated so the user must only click the
  latest invitation email link.
- `sms`: an error when trying to deliver the SMS with MailJet. Any error here is most likely an error on our side (
  insufficient funds, configuration etc.) or on MailJet's side.

More unlikely errors currently not given a custom error message. If a retry from the user doesn't work out they should
contact us:

- `send_pin_invalid_status`: case doesn't have the correct status for the sms to be sent. Since we excluded success case
  already this should not happen anymore.
- `pin_not_sent`: the case is not in status `PIN_SENT` when checking for the pin. Could be that a stale browser window
  is still open. User should try the flow again, and it should either re-send or land on the success page.
- `invalid_case_id`: case was not found. This could mean that the wrong environment was used, e.g. a staging token
  opened on the production instance.
- `oauth_invalid_status`: when waiting for the oauth callback the case status has to be PIN_SUCCEEDED to transition to
  the final state OAUTH_SUCCEEDED. If this is not the case, this error is given.
- `oauth_refresh_failed`: after receiving the CHDP callback in the oauth process, fetching the refreshToken from CHDP
  failed
- `oauth_state_not_found`: after receiving the CHDP callback in the oauth process, the random state used to communicate
  with CHDP is used as common identifier. This identifier was not found, hence something in the oauth process went
  wrong.
- `oauth_error`: receiving an error from CHDP at our callback url. This could mean that the user clicked DENY instead of
  ALLOW and should repeat the process once more.
- other: any other error from outbox application.

#### Success

For success there is an optional query param `kind` that as of now can only be `already_paired` and could be used to
display a different error message to the user.