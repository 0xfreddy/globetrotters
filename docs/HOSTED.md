# Operate Globetrotters hosted tracking

Hosted projects use **Clerk accounts**. Users sign in at `/dashboard`, create projects and manage their own domains, installation commands, visitor totals, monthly request usage, pause/resume and deletion. Self-hosting does not require Clerk.

## Clerk setup (owner)

1. Create a Globetrotters application in [Clerk](https://dashboard.clerk.com/) and enable your preferred sign-in methods (for example email and Google).
2. In Railway → Globetrotters → Variables, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same Clerk instance, plus `HOSTED_ENABLED=true`. Keep the secret key server-only. Retain the existing `REDIS_URL`, `TRACKING_SECRET`, `APP_URL` and `GEOIP_PROVIDER=railway`.
3. **Rebuild and redeploy**, because the publishable key is embedded at build time. `APP_URL` must match the website origin exactly. The app sets its sign-in and sign-up URLs to `/dashboard/sign-in` and `/dashboard/sign-up` and returns users to `/dashboard`.
4. Use development keys for testing. Before public launch, create Clerk's production instance, configure your custom domain and required DNS/OAuth settings in Clerk, then deploy with production keys. Follow [Clerk's deployment guide](https://clerk.com/docs/guides/development/deployment/production).
5. Test with two accounts: create a project with one, verify the other cannot list/change/delete it, then install the globe on its configured origin.

No webhook is required: Redis records store Clerk user IDs directly and each dashboard API request checks the signed-in owner. Users should delete projects before deleting their Clerk account; account deletion is not automatically synchronized to Redis. An operator can clean up orphaned projects using the optional admin API. Legacy management-key projects are not automatically assigned to accounts and remain accessible only through their existing capability/admin API. There is no implicit domain-based claiming.

Without Clerk keys, dashboard routes show an honest setup-pending page; APIs deny access. Visitors viewing an installed globe never sign in. Account registration is open according to your Clerk settings, bounded by the global project capacity and five create attempts per user per hour. Domain verification, billing and abuse prevention beyond these limits are not implemented.

## Owner configuration

In Railway → Globetrotters service → Variables, retain the existing `REDIS_URL`, `TRACKING_SECRET`, `APP_URL` and `GEOIP_PROVIDER=railway` values, then add:

```env
HOSTED_ENABLED=true
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
CLERK_SECRET_KEY=<your Clerk secret key>
# Optional legacy invite and operator access:
HOSTED_SIGNUP_CODE=<optional random invite code>
HOSTED_ADMIN_KEY=<a different random secret that only you keep>
HOSTED_MAX_PROJECTS=100
HOSTED_REQUESTS_PER_MINUTE=300
HOSTED_MONTHLY_REQUEST_LIMIT=100000
```

For the optional legacy invite and admin secrets, generate each separately using `openssl rand -hex 32`. Store the admin key in your password manager. Never put either secret into `NEXT_PUBLIC_*`, Git, URLs, frontend code, or a public issue. Invite codes are submitted in a POST body; management keys are sent only in Authorization headers. Rotate the invite code to close old invitations without affecting installed projects.

The last three settings are optional and those are their defaults. Request limits are **per project**. Each visible browser sends a heartbeat every 30 seconds, so 100,000 requests is about 833 visitor-hours, not 100,000 visitors. Every accepted-origin heartbeat counts toward quota, including deduplicated heartbeats. Monthly quotas follow UTC calendar months. The project-count ceiling limits signup capacity. Quotas do not impose a Railway spending cap: configure Railway usage alerts and your desired billing controls separately.

The existing `APP_URL` must exactly match the origin serving the setup form, with no trailing slash. The service must have a working Redis connection and a stable tracking secret. Changing `TRACKING_SECRET` resets daily visitor deduplication for existing browser IDs. The Railway domain works for development-key testing; Clerk production requires a domain you control and its DNS configuration.

**Do not set `SELF_HOSTED_ORIGIN` on the shared hosted service.** That variable is for customers running their own deployment.

## User flow

1. Open **Host with us → Open your dashboard** and sign in or sign up.
2. Create a project with its name and exact website origin; accept the tracking disclosure.
3. Copy the generated shadcn install command into an initialized shadcn React project.
4. Add `<VisitorGlobe />` to the page.
5. Return to the dashboard to see usage, rename the project, change its allowed origin, pause/resume or delete it.

Origins match exactly, including scheme, port and `www`. Local development requires a separate project for `http://localhost:3000`. Duplicate origins do not grant access to another account's project. Project IDs are public. CORS does not prevent scripts forging an Origin header; this is not fraud-resistant analytics.

## Manage projects

Dashboard requests authenticate with Clerk and authorize every project operation by its stored owner ID. Public responses exclude owner IDs and management-key hashes. Deletion removes the project and visitor totals; in-flight collector records may remain until their TTL expires.

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
