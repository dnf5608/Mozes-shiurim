import fs from 'node:fs';
const seed = JSON.parse(fs.readFileSync(new URL('../site/videos.json', import.meta.url), 'utf8'));
const podcastSeed = JSON.parse(fs.readFileSync(new URL('../site/podcasts.json', import.meta.url), 'utf8'));
const CHANNEL = 'UCX9HITTyuBR8dGobqUo9L8g';
const KEY = 'channel-catalog-v1.json';
const datedSeed = new Map(([...seed, ...podcastSeed.videos]).map(v => [v.id, v.publishedAt]));
let running = null;
function* walk(x) { if (!x || typeof x !== 'object')
    return; if (!Array.isArray(x))
    yield x; for (const v of Object.values(x))
    yield* walk(v); }
function viewsOf(value) { for (const part of walk(value)) {
    for (const field of ['accessibilityLabel', 'content', 'simpleText']) {
        const text = part[field];
        if (typeof text === 'string' && /^(?:[\d,.]+(?:[KMB]|\s*(?:thousand|million|billion))?|No)\s+views?$/i.test(text.trim()))
            return text.trim();
    }
} return undefined; }
async function recentUploadDates() {
    try {
        const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`, { signal: AbortSignal.timeout(12000) });
        if (!response.ok)
            return new Map();
        const xml = await response.text();
        const dates = new Map();
        for (const entry of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
            const id = entry[1].match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1], published = entry[1].match(/<published>([^<]+)<\/published>/)?.[1];
            if (id && published && Number.isFinite(Date.parse(published)))
                dates.set(id, published);
        }
        return dates;
    }
    catch {
        return new Map();
    }
}
async function source(kind) {
    const url = kind === 'podcast' ? `https://www.youtube.com/playlist?list=${podcastSeed.id}` : `https://www.youtube.com/channel/${CHANNEL}/${kind === 'short' ? 'shorts' : 'videos'}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok)
        throw Error(`YouTube returned ${response.status}`);
    const html = await response.text();
    const match = html.match(/var ytInitialData = (.*?);<\/script>/s);
    if (!match)
        throw Error('YouTube channel data was unavailable');
    const initial = JSON.parse(match[1]);
    if (kind !== 'podcast' && initial.metadata?.channelMetadataRenderer?.externalId !== CHANNEL)
        throw Error('Channel identity could not be verified');
    if (kind === 'podcast' && !initial.metadata?.playlistMetadataRenderer)
        throw Error('Podcast playlist unavailable');
    let data = initial.contents;
    const result = [];
    const seen = new Set();
    const contextMatch = html.match(/"INNERTUBE_CONTEXT":(\{.*?\}),"INNERTUBE_CONTEXT_CLIENT_NAME"/s);
    for (let page = 0; page < 30; page++) {
        const tokens = [];
        for (const obj of walk(data)) {
            const v = obj.lockupViewModel;
            if (v?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
                const badges = [...walk(v.contentImage)].filter(z => z.thumbnailBadgeViewModel);
                result.push({ id: v.contentId, title: v.metadata.lockupMetadataViewModel.title.content, kind: kind === 'podcast' ? 'video' : kind, duration: badges[0]?.thumbnailBadgeViewModel.text || '', views: viewsOf(v.metadata) });
            }
            const s = obj.shortsLockupViewModel;
            if (s) {
                const cmd = [...walk(s)].find(z => z.reelWatchEndpoint?.videoId);
                if (cmd)
                    result.push({ id: cmd.reelWatchEndpoint.videoId, title: s.overlayMetadata?.primaryText?.content || 'Short', kind: 'short', duration: '', views: viewsOf(s.overlayMetadata) });
            }
            if (obj.continuationItemRenderer)
                for (const c of walk(obj.continuationItemRenderer))
                    if (c.continuationCommand?.token)
                        tokens.push(c.continuationCommand.token);
        }
        const token = tokens.find(t => !seen.has(t));
        if (!token)
            break;
        if (!contextMatch)
            throw Error('Pagination context missing');
        seen.add(token);
        const next = await fetch('https://www.youtube.com/youtubei/v1/browse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: JSON.parse(contextMatch[1]), continuation: token }), signal: AbortSignal.timeout(20000) });
        if (!next.ok)
            throw Error('Could not retrieve the complete channel list');
        data = await next.json();
        if (page === 29)
            throw Error('Channel exceeded pagination limit');
    }
    if (!result.length)
        throw Error('Channel returned an empty list');
    if (result.some(v => !/^[-\w]{11}$/.test(v.id) || !v.title))
        throw Error('Invalid channel item');
    return result;
}
export async function readCatalog(bucket) { const obj = await bucket.get(KEY); const catalog = obj ? await obj.json() : { videos: seed, checkedAt: null, added: 0 }; const dates = datedSeed; for (const v of catalog.videos)
    if (!v.publishedAt)
        v.publishedAt = dates.get(v.id); for (const v of catalog.podcast?.videos || [])
    if (!v.publishedAt)
        v.publishedAt = dates.get(v.id); return catalog; }
export async function refreshCatalog(bucket) {
    const previous = await readCatalog(bucket);
    // Anyone may read this fixed public channel. No request can supply records,
    // source URLs, or credentials. Revalidation is rate-limited and server-owned.
    if (running)
        return running;
    running = (async () => {
        const [regular, shorts, podcastVideos, recentDates] = await Promise.all([source('video'), source('short'), source('podcast'), recentUploadDates()]);
        const existing = new Set(previous.videos.map(v => v.id));
        const current = [...regular, ...shorts];
        const old = new Map(previous.videos.map(v => [v.id, v]));
        for (const v of current) {
            if (!v.views)
                v.views = old.get(v.id)?.views;
            v.publishedAt = recentDates.get(v.id) || old.get(v.id)?.publishedAt || datedSeed.get(v.id);
        }
        const map = new Map(current.map(v => [v.id, v]));
        for (const v of previous.videos)
            if (!map.has(v.id))
                map.set(v.id, { ...v, publishedAt: v.publishedAt || datedSeed.get(v.id) });
        for (const v of podcastVideos) {
            if (!v.views)
                v.views = map.get(v.id)?.views;
            v.publishedAt = map.get(v.id)?.publishedAt || previous.podcast?.videos.find(p => p.id === v.id)?.publishedAt;
        }
        const unique = new Map([...map.values(), ...podcastVideos].map(v => [v.id, v]));
        const pending = [...unique.values()].filter(v => !v.publishedAt);
        let cursor = 0;
        await Promise.all(Array.from({ length: 4 }, async () => {
            while (cursor < pending.length) {
                const v = pending[cursor++];
                try {
                    const response = await fetch(`https://www.youtube.com/watch?v=${v.id}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
                    if (!response.ok)
                        continue;
                    const html = (await response.text()).replaceAll('\\"', '"');
                    const raw = html.match(/"publishDate":"([^"]+)"/)?.[1] || html.match(/<meta itemprop="datePublished" content="([^"]+)"/)?.[1];
                    if (raw && Number.isFinite(Date.parse(raw)))
                        v.publishedAt = raw;
                }
                catch { /* Keep existing dates; retry unavailable dates at the next daily check. */ }
            }
        }));
        for (const v of map.values())
            v.publishedAt = unique.get(v.id)?.publishedAt;
        for (const v of podcastVideos)
            v.publishedAt = unique.get(v.id)?.publishedAt;
        const catalog = { datesVersion: 2, viewsVersion: 2, videos: [...map.values()], podcast: { id: podcastSeed.id, title: podcastSeed.title, videos: podcastVideos }, checkedAt: new Date().toISOString(), added: current.filter(v => !existing.has(v.id)).length };
        await bucket.put(KEY, JSON.stringify(catalog), { httpMetadata: { contentType: 'application/json' } });
        return catalog;
    })();
    try {
        return await running;
    }
    finally {
        running = null;
    }
}
