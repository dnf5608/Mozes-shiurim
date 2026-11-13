# Rabbi Yisrael Mozes — free independent hosting

This is a standalone migration of the existing video library to GitHub Pages with GitHub Actions. It does not need ChatGPT, Cloudflare, R2, a paid domain, an API key, or npm packages. Videos continue to stream from YouTube.

## Publish in your own free GitHub account

1. Create a **public** repository named `mozes-shiurim` with default branch `main`.
2. Add the contents of this folder at the repository root. Include `.github/workflows/publish.yml`; hidden folders can be missed when uploading from a tablet. A connected GitHub assistant or Git client can upload the complete folder. Do not upload only the ZIP itself.
3. Open repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. In **Settings → Actions → General**, allow the included actions. Enable read/write workflow permissions if the repository settings require it, so the workflow can commit the refreshed catalog.
5. Open **Actions → Refresh and publish video library → Run workflow** on `main`.
6. Wait for all steps, including **Verify published catalog**, to pass. The deployment displays the new URL, normally `https://YOUR-USERNAME.github.io/mozes-shiurim/`.
7. Check playback on your tablet before closing the old workspace. Keep your complete original source backup separately.

Your repository source will be public. Never add passwords, account exports or tokens. The workflow uses GitHub's temporary built-in token, not a saved personal access token. Enable two-factor authentication if GitHub requires it for publishing.

## Daily updates

The included workflow requests **08:00 America/New_York**, accounting for daylight saving time. GitHub queues scheduled jobs and can delay or drop them under load, so this is a daily target, not an exact-time guarantee. You can manually run it at any time from Actions. Workflows must be on the default branch. GitHub can disable schedules on inactive public repositories; check Actions periodically and re-enable if needed.

The updater fetches regular videos, Shorts and the official podcast playlist; preserves previous catalog entries; deduplicates IDs; refreshes available YouTube view counts; retains known dates; attempts missing date lookups; and saves the catalog. Each successful run records its checkedAt and count. It has no 12-hour cooldown. If YouTube or a parser fails, the job fails before publication and the previously deployed website stays online. Fetching YouTube web data can break if YouTube changes its page format or blocks requests from a GitHub runner. Successful testing here does not establish that GitHub's network will be accepted; the first real workflow run must verify that.

## Files

- `site/`: publish this directory; it contains the original design, images, YouTube player, local viewing progress, watched buttons, search, sorting, podcasts, and data.
- `scripts/collector.mjs`: dependency-free Node implementation of the original channel collector.
- `scripts/refresh.mjs`: validates and saves refresh outputs; requires Node 24.
- `scripts/verify-live.mjs`: verifies the deployed count and checkedAt.
- `scripts/test-playback.mjs`: existing player regression checks adapted to the standalone directory.
- `data/catalog.json`: saved durable catalog; committed by the workflow for future runs.
- `data/collector-source.ts`: TypeScript source used to generate the standalone collector; no compiler is needed to run it.
- `.github/workflows/publish.yml`: daily refresh and deployment.

For local checks run `node scripts/test-playback.mjs`, then `node scripts/refresh.mjs`. Preview with `python3 -m http.server 8000 --directory site`.

## Migration limits

The old chatgpt.site URL cannot be moved to GitHub. The new URL gets a separate browser-local viewing history; old saved positions do not automatically transfer. YouTube background-playback and filter restrictions remain unchanged. The podcast tab still uses YouTube video embeds; it is not a separate audio source. The free plan requires a public repository and is subject to GitHub Pages/Actions limits. No ongoing hosting fee is required within those limits. A custom domain is optional and its registration is separate.

## Alternatives reviewed

- GitHub Pages plus GitHub Actions: recommended free single-account option for this static library plus a scheduled collector.
- Cloudflare Workers plus R2: closest to the original deployment, but the Free Worker CPU/subrequest limits need separate testing or updater redesign. Moving it unchanged is not a confirmed free solution.
- Google Sites: supports embeds, but cannot directly run this existing Worker or its scheduled server-side collector. An external updater/host would still be necessary to retain these features.

## Documentation

- https://docs.github.com/en/pages/getting-started-with-github-pages
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://developers.cloudflare.com/workers/platform/limits/
- https://support.google.com/sites/answer/90569

## Verification of this package

On November 13, 2026, the standalone collector completed a real YouTube fetch: 317 regular-video/Short records and 57 podcast entries. Podcast entries can overlap the main collection. Playback-state tests passed. Static resource paths and data files were checked locally. No GitHub deployment has been performed yet; a connected account and the first successful live workflow are still required. The existing site was not changed.
