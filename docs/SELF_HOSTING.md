# Self-host live tracking

Use **Set up live tracking → Self-host**. Enter your website URL and run the generated setup command:

```sh
npx --yes --package=https://globetrotters-production-dc49.up.railway.app/downloads/globetrotters-setup.tgz globetrotters-setup --site https://example.com
```

Requires Node 22+ and a Railway account. Railway hosting charges apply. Sign in when prompted. With multiple Railway workspaces, append `--workspace YOUR_WORKSPACE_ID`.

The command creates a new project, adds Redis, deploys the tracker from GitHub, generates a new random tracking secret, configures the exact website origin and creates a public backend URL. It waits for the health check, then prints a configured shadcn install command and usage snippet. Run that install command in your existing React project and add `<VisitorGlobe />`.

You can also paste the backend URL into the setup dialog to regenerate the install command. The setup command operates from a temporary directory, so it does not relink or modify your existing app. It creates a new Railway project each time: on a partial failure, inspect the dashboard before retrying, to avoid duplicates. `--help` shows usage without provisioning anything.

The visual component and client are copied into your project, so they are yours to customize. The setup page never receives your Redis password or tracking secret. All runtime visitor requests go directly from your website to your backend.

## Manual fallback

Deploy `https://github.com/0xfreddy/globetrotters` to Railway, add a Redis service and set:

```env
REDIS_URL=${{Redis.REDIS_URL}}
TRACKING_SECRET=<generate with openssl rand -hex 32>
APP_URL=https://<your-backend-domain>
GEOIP_PROVIDER=railway
SELF_HOSTED_ORIGIN=https://<your-frontend-domain>
HOSTED_ENABLED=false
PORT=3000
```

`SELF_HOSTED_ORIGIN` is the frontend that embeds the globe; `APP_URL` is the backend that serves this app. The collector refuses all origins other than the configured frontend. Redis must be persistent. The bundled `railway.json` configures health checks and start behavior.

The standalone collector uses `/api/collect/self`. It does not use third-party cookies. IDs live in first-party localStorage for 24 hours; active browsers expire after 75 seconds. Country totals cover 30 UTC days and expire after 31 days. Set `HOSTED_MONTHLY_REQUEST_LIMIT` and `HOSTED_REQUESTS_PER_MINUTE` to raise the defaults of 100,000 requests/month and 300 requests/minute for your own deployment.

## Testing

Open your frontend on its configured URL. Browser network tools should show an OPTIONS preflight and a successful POST to `/api/collect/self`. A 403 usually means the website origin is wrong; a 429 means a quota was reached; a 503 means configuration or storage is unavailable. Unknown countries are counted but never assigned invented locations. The globe requires WebGL.

If deploying behind another provider, remove `GEOIP_PROVIDER=railway` and set `TRUSTED_COUNTRY_HEADER` only to a header that the trusted edge overwrites, such as `x-vercel-ip-country` on Vercel. Do not blindly trust client-supplied geo headers.
