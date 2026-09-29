# Globetrotters

Small world. Real people. A customizable, open-source visitor globe for React, with a compact shadcn/ui playground.

**[Live playground](https://globetrotters-production-dc49.up.railway.app)** · **[Submit your site](https://github.com/0xfreddy/globetrotters/issues/new?template=showcase.yml)**

## Install

Run in a React project with shadcn/ui already initialized:

```sh
npx shadcn@latest add https://globetrotters-production-dc49.up.railway.app/r/globetrotters.json
```

This adds the source component and COBE dependency. No account, tracking endpoint, or secret is required. It works with React and Next.js. The wrapper needs a width; the globe maintains a square aspect ratio.

```tsx
import { Globetrotters } from "@/components/globetrotters";

<Globetrotters
  className="w-full max-w-md"
  settings={{ baseColor: "#a1ad8a", markerColor: "#526b30", speed: 0.12 }}
  locations={[
    { location: [51.5, -0.1], count: 48, label: "United Kingdom" },
    { location: [20.6, 78.9], count: 65, label: "India" },
  ]}
/>
```

Change settings in the playground and choose **Copy component** to export the full configuration. All customization is stored locally in your browser. Example locations are clearly labeled; switch to live data to see actual visits to the playground.

### Globe settings

| Property | Default | Meaning |
| --- | --- | --- |
| `baseColor`, `markerColor`, `glowColor` | sage, olive, white | Six-digit hex colors |
| `dark`, `diffuse`, `mapBrightness` | 0, 1.4, 5 | Lighting and contrast |
| `mapSamples` | 18000 | Map dot density (higher costs more GPU time) |
| `scale`, `theta` | 1, 0.22 | Zoom and latitude tilt in radians |
| `speed`, `autoRotate` | 0.12, true | Radians per second; negative reverses direction |
| `drag`, `damping` | true, 0.92 | Drag interaction and retained inertia per 60Hz frame |
| `transition` | 550 | Approximate visual transition time in milliseconds |
| `markerSize`, `markerElevation` | 0.045, 0.02 | Marker dimensions; sizes scale with visit counts |
| `showMarkers`, `showArcs` | true, false | Visibility of markers and connection arcs |
| `arcHeight`, `arcWidth` | 0.3, 0.5 | Arc geometry |

The globe supports touch, pointer dragging and arrow-key rotation. Auto rotation and animated property transitions respect `prefers-reduced-motion`. Offscreen rendering pauses and rendering stops when the tab is hidden. WebGL is required; unsupported browsers receive a fallback message.

## Visitor tracking

The installable globe is **telemetry-free**. Installing it does not send visitor data to us. The playground includes an optional reference backend, separate from the one-command visual component.

To self-host the full project:

```sh
git clone https://github.com/0xfreddy/globetrotters.git
cd globetrotters
npm ci
cp .env.example .env.local
# Set REDIS_URL and TRACKING_SECRET in .env.local
npm run dev
```

- `POST /api/globetrotters` receives a same-origin heartbeat every 30 seconds while the page is visible.
- Redis keeps active browsers for 75 seconds. Counts represent browser sessions, not verified unique humans; tabs sharing a cookie count as one browser.
- A signed, random, HttpOnly cookie and a Redis key deduplicate country visits for 24 hours. Clearing cookies creates a new visit.
- Aggregate country totals remain in Redis. Active identifiers expire. No IP addresses are saved in the application database or application logs.
- On Railway, set `GEOIP_PROVIDER=railway`: the trusted `X-Real-IP` request header is used for an in-process GeoIP lookup, then discarded. No third-party geolocation request is made. IP-derived country estimates can be inaccurate, especially for VPNs. The bundled lookup database should be refreshed periodically by upgrading `geoip-lite` or following its update instructions.
- On Vercel or Cloudflare, set `TRUSTED_COUNTRY_HEADER` only when the edge overwrites that header. Never trust an arbitrary country header on an unprotected origin. Unresolvable countries remain `unknown`; they are counted but not plotted.
- `GET /api/globetrotters` returns online count, country totals and location records suitable for the `locations` prop. Data responses are uncached.
- Without Redis, the UI honestly reports tracking as unavailable; it never fabricates a live count.
- The endpoint limits repeated updates per signed browser to one every 10 seconds, but is not a fraud-resistant analytics service. Add edge rate limiting for exposed high-traffic deployments. Hosting providers may independently retain infrastructure request logs.

## Adoption and showcase

We cannot reliably discover every site that copies open-source code. There is no hidden beacon or install telemetry. Owners can opt into the public showcase through the **Submit your site** GitHub issue template. This gives maintainers a reviewable record of adopters. Verify the submission and permission, then add a preview in `src/app/page.tsx`.

The showcase starts with this site and a separately labeled inspiration entry. It does not claim the original portfolio uses Globetrotters. Preview tiles are illustrations, not screenshots.

## Development and deployment

```sh
npm run build       # Regenerate the public shadcn registry, then build Next.js
npm run typecheck
npm test
npm run start
```

Deploy on Railway with a Redis service. Set `REDIS_URL` to the Redis service reference, `TRACKING_SECRET` to a random 32-byte secret, `APP_URL` to the public origin, `GEOIP_PROVIDER=railway`, and `PORT=3000`. `/api/health` is the deployment health check. The included Railway configuration supplies build/start behavior. Keep registry URL and page install command aligned if changing the hostname.

CI builds, checks types and runs unit tests on pushes and pull requests. The registry artifact is generated from the actual component, so exported code and installed code stay aligned.

## Credits

Inspired by [Dhatrish Dixit's portfolio](https://github.com/dhatrishdixit/portfoliov2). The reference was cloned and studied; this project is an independent implementation and does not redistribute its unlicensed portfolio source or personal content.

Built with [COBE](https://github.com/shuding/cobe), [shadcn/ui](https://ui.shadcn.com), Radix UI, and react-colorful (composed inside the shadcn Popover for color picking). Country centroids come from `world-countries`; local IP lookup uses `geoip-lite`. Dependencies retain their respective licenses.

Built by [0xfreddy](https://github.com/0xfreddy). MIT licensed.
