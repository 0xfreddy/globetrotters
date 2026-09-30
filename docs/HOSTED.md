# Operate Globetrotters hosted tracking

The hosted service is prepared as an **invite-only beta**. Registration is disabled unless the owner configures every required setting. It reuses the existing Railway application and Redis database. No extra external authentication or email provider is required.

## Owner configuration

In Railway → Globetrotters service → Variables, retain the existing `REDIS_URL`, `TRACKING_SECRET`, `APP_URL` and `GEOIP_PROVIDER=railway` values, then add:

```env
HOSTED_ENABLED=true
HOSTED_SIGNUP_CODE=<a long random invite code you share with approved users>
HOSTED_ADMIN_KEY=<a different random secret that only you keep>
HOSTED_MAX_PROJECTS=100
HOSTED_REQUESTS_PER_MINUTE=300
HOSTED_MONTHLY_REQUEST_LIMIT=100000
```

Generate each secret separately using `openssl rand -hex 32`. Store the admin key in your password manager. Never put either secret into `NEXT_PUBLIC_*`, Git, URLs, frontend code, or a public issue. Invite codes are submitted in a POST body; management keys are sent only in Authorization headers. Rotate the invite code to close old invitations without affecting installed projects.

The last three settings are optional and those are their defaults. Request limits are **per project**. Each visible browser sends a heartbeat every 30 seconds, so 100,000 requests is about 833 visitor-hours, not 100,000 visitors. Every accepted-origin heartbeat counts toward quota, including deduplicated heartbeats. Monthly quotas follow UTC calendar months. The project-count ceiling limits signup capacity. Quotas do not impose a Railway spending cap: configure Railway usage alerts and your desired billing controls separately.

The existing `APP_URL` must exactly match the origin serving the setup form, with no trailing slash. The service must have a working Redis connection and a stable tracking secret. Changing `TRACKING_SECRET` resets daily visitor deduplication for existing browser IDs. No custom domain is required; set one up before public launch if you want a stable branded endpoint.

**Do not set `SELF_HOSTED_ORIGIN` on the shared hosted service.** That variable is for customers running their own deployment.

## User flow

1. Open **Set up live tracking → Host with us**.
2. Enter a project name, exact website origin, and the invite code; accept the tracking disclosure.
3. Save the project ID and private management key. The server keeps only a hash of the key. Lost keys require owner assistance; there is no automated email recovery.
4. Run the generated shadcn command in an initialized shadcn React project.
5. Add `<VisitorGlobe />` to the page. It already knows the public project ID and endpoint.

The website origin must match exactly, including scheme, port and `www`. For local development, create a separate project for `http://localhost:3000`. There is no wildcard domain support. Creating a project is not proof of domain ownership: this beta relies on trusted invite distribution, and duplicate origins do not grant access to another project's data. For open public signups, add account authentication, domain verification, recovery, edge bot protection and per-customer billing/quotas first.

The public project ID is **not a secret**. Exact-origin CORS protects browser integrations but cannot stop scripts forging an Origin header. Limits bound requests per registered project; use edge rate limiting to protect the service from arbitrary invalid-request traffic. This is not fraud-resistant analytics.

## Manage projects

Users can reopen the setup dialog's **Manage an existing project** section to pause, resume or delete with their ID and management key. Deletion has an explicit confirmation and removes the project plus its aggregate counts and ephemeral keys. Already in-flight requests may finish; any remaining ephemeral records expire automatically.

Owner API:

- `GET /api/hosted/admin` with `Authorization: Bearer <HOSTED_ADMIN_KEY>` lists registered project names, origins, IDs, creation times and paused state. Management-key hashes are never returned.
- `PATCH /api/hosted/projects/:id` with the admin key, `Origin: <APP_URL>`, JSON `{ "disabled": true }` pauses a project. Use `false` to resume.
- `DELETE /api/hosted/projects/:id` with the admin key and the same Origin removes it.

Project owners use their private management key in place of the owner admin key for the last two operations. The immutable project origin prevents a stolen public ID from changing its allowlist. To change domains, create a new project and delete the old one.

Set `HOSTED_ENABLED=false` to stop hosted signup and collection globally. Self-host collection is independent. Keep Redis persistent and configure backups if totals matter to you. Monitor errors, Redis memory, outbound bandwidth, and quota rejections. No billing, payments, subscription enforcement, email delivery or automatic recovery has been added.

## Data and retention

- A random UUID is kept in **the customer's first-party localStorage**, with a 24-hour expiry. No cross-site cookie or fingerprint is used. If storage is unavailable, an in-memory ID lasts until the page reloads.
- The server hashes the UUID with a project-specific HMAC; the same browser cannot be joined across projects through stored IDs.
- Active-browser records expire after 75 seconds; their Redis container expires after 120 seconds. Daily deduplication keys expire after 24 hours.
- Country buckets expire after 31 days and the API displays the current UTC day plus the previous 29 days. Monthly request counters expire after 32 days. Project metadata remains until deletion.
- IPs are processed locally to estimate country, not saved by the application. Hosting providers may independently retain request logs.
- Site owners should disclose this tracking and control consent where appropriate. The installed component accepts `enabled={false}` to defer all tracking until they opt in.
- Hosted registration is separate from the public showcase. Registering a domain never automatically publishes it in the showcase.
