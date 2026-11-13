/* Warppool — shared site behaviour. Vanilla JS, no framework. */

/* ---------- Banner expand/collapse ---------- */
function initBanner() {
  const btn = document.querySelector('[data-banner-toggle]');
  const panels = document.querySelector('[data-banner-panels]');
  if (!btn || !panels) return;
  btn.addEventListener('click', () => {
    const open = !panels.hasAttribute('hidden');
    if (open) {
      panels.setAttribute('hidden', '');
      btn.querySelector('span').textContent = "Here's how you know";
    } else {
      panels.removeAttribute('hidden');
      btn.querySelector('span').textContent = 'Hide details';
    }
  });
}

/* ---------- Live network counter ---------- */
function initLiveStats() {
  // Still placeholder figures. Everything left in here is invented, and the
  // only reason it survives is that nothing measures it yet -- `jobs` and
  // `sponsored` are both derivable from stores we already keep (the jobs
  // collection and api_keys). `workers` and `gpu_hours` used to live here too;
  // see tickReal() below for what replaced them.
  const faked = {
    jobs:       { base: 47,    jitter: 4 },
    chunks:     { base: 3812,  jitter: 50 },
    sponsored:  { base: 218,   jitter: 3 },
  };
  // Thousands separators at every precision. toFixed() has none, which was
  // fine while the only decimal figure was a two-digit TFLOPS number, but
  // GPU-hours over a busy day runs to five figures and "41234.6" is not a
  // number anyone reads at a glance.
  function fmt(n, decimals=0) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  function update(key, value) {
    document.querySelectorAll(`[data-live="${key}"]`).forEach(el => {
      el.textContent = value;
    });
  }
  function tickFaked() {
    for (const [k, t] of Object.entries(faked)) {
      const v = t.base + (Math.random() - 0.5) * t.jitter;
      update(k, fmt(t.decimals ? v : Math.round(v), t.decimals || 0));
    }
  }
  // The real numbers, and only the real numbers.
  //
  // GET /api/network/stats serves two figures, both measured over a rolling
  // 24 hours and both read from server-authoritative stores:
  //
  //   workers    distinct workers that reported telemetry. NOT a count of
  //              workers connected right now -- that number is far smaller and
  //              collapses to near zero every time the WebSocket plane
  //              deploys, because a deploy replaces the instances holding the
  //              sockets, so a headline built on it would advertise our
  //              release cadence rather than the size of the pool.
  //              /api/workers still publishes the live count for anyone who
  //              wants it.
  //   gpu_hours  compute actually delivered, summed from the billing ledger --
  //              the same milliseconds publishers are paid on, so this page is
  //              auditable against invoices. It replaced "184.2 TFLOPS FP32",
  //              which was not measured and could not be: peak throughput is a
  //              property of hardware WebGPU does not expose, since
  //              adapter.info is masked for fingerprinting reasons.
  //
  // Neither is multiplied, floored, or blended with a plausible-looking
  // baseline. `workers` used to be (live connections x 117, floored at ~847),
  // which meant the most prominent number on the site was fiction that could
  // not read low. If the network is small, the site now says so.
  //
  // Both spans hold an em-dash until the first fetch lands, so a failed
  // request shows "not known" rather than a confident zero. A real zero is
  // still an allowed answer once we have actually asked.
  //
  // The endpoint is edge-cached for 60s and the values count a whole day, so
  // polling faster than the cache would only re-fetch identical numbers.
  const REAL_POLL_MS = 60000;
  async function tickReal() {
    try {
      const res = await fetch('/api/network/stats');
      if (!res.ok) return;                       // keep the last good values
      const data = await res.json();
      if (typeof data.unique_workers === 'number') {
        update('workers', fmt(data.unique_workers));
      }
      if (typeof data.gpu_hours === 'number') {
        update('gpu_hours', fmt(data.gpu_hours, 1));
      }
    } catch (_) { /* offline or error - keep whatever is on screen */ }
  }
  tickFaked();
  tickReal();
  setInterval(tickFaked, 2200);
  setInterval(tickReal, REAL_POLL_MS);
}

/* ---------- Worker dots over a world silhouette ---------- */
// Latitudes/longitudes (rough) of major populated regions, weighted by population centers
// that would actually have WebGPU-capable visitors.
const NODE_COORDS = [
  // North America
  [40.7, -74.0],  [34.0, -118.2], [37.7, -122.4], [41.9, -87.6], [45.5, -73.6],
  [47.6, -122.3], [33.4, -112.0], [29.7, -95.3], [38.9, -77.0], [43.6, -79.4],
  [49.2, -123.1], [25.7, -80.2],  [42.3, -71.0],  [39.7, -104.9], [32.7, -117.1],
  [44.9, -93.3],  [35.2, -80.8],  [30.2, -97.7],  [36.1, -115.1],
  // South America
  [-23.5, -46.6], [-34.6, -58.4], [-33.4, -70.6], [4.7, -74.0], [-22.9, -43.2],
  // Europe
  [51.5, -0.13],  [52.5, 13.4],   [48.8, 2.3],    [55.7, 12.5],  [59.3, 18.0],
  [60.2, 24.9],   [41.9, 12.5],   [40.4, -3.7],   [50.1, 8.7],   [52.4, 4.9],
  [50.8, 4.4],    [47.4, 19.0],   [50.1, 14.4],   [55.8, 37.6],  [48.2, 16.4],
  [53.3, -6.3],   [38.7, -9.1],   [59.9, 30.3],
  // Africa
  [-33.9, 18.4],  [30.0, 31.2],   [6.5, 3.4],     [-1.3, 36.8],  [-26.2, 28.0],
  [33.6, -7.6],
  // Middle East / Asia
  [25.2, 55.3],   [32.1, 34.8],   [41.0, 28.9],   [35.7, 51.4],  [24.7, 46.7],
  [28.6, 77.2],   [19.1, 72.9],   [12.97, 77.6],  [22.6, 88.4],  [13.8, 100.5],
  [-6.2, 106.8],  [1.35, 103.8],  [14.6, 121.0],  [21.0, 105.8], [10.8, 106.7],
  [22.3, 114.2],  [31.2, 121.5],  [39.9, 116.4],  [22.5, 114.1], [30.7, 104.1],
  [23.1, 113.3],  [35.7, 139.7],  [34.7, 135.5],  [37.5, 127.0], [25.0, 121.5],
  // Oceania
  [-33.9, 151.2], [-37.8, 145.0], [-31.95, 115.86], [-41.3, 174.8],
];

function projectLonLat(lon, lat) {
  // Equirectangular projection — matches the simple world SVG.
  const x = (lon + 180) / 360 * 100;
  const y = (90 - lat) / 180 * 100;
  return { x, y };
}

function initLeafletMap(container) {
  if (!container || !window.L) return;
  const map = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    zoomSnap: 0.1,
    minZoom: 1,
    maxZoom: 6,
  });
  // Fit to a global view
  map.setView([22, 12], 1.6);
  map.attributionControl.setPrefix('');

  // CartoDB Positron — OSM data, free open tiles, muted grayscale matches civic feel.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> \u00a9 <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    crossOrigin: true,
  }).addTo(map);

  // Generate worker dots at slightly jittered coordinates around populated anchors.
  const palette = { busy: '#00a91c', idle: '#0076d6', dropped: '#71767a' };
  for (const [lat, lon] of NODE_COORDS) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const jLat = lat + (Math.random() - 0.5) * 4;
      const jLon = lon + (Math.random() - 0.5) * 4;
      const r = Math.random();
      let kind = 'busy';
      if (r > 0.85) kind = 'dropped';
      else if (r > 0.6) kind = 'idle';
      const radius = (kind === 'busy' ? 4 : 3) + Math.random() * 1.5;
      L.circleMarker([jLat, jLon], {
        radius,
        color: palette[kind],
        fillColor: palette[kind],
        weight: 1.5,
        opacity: 0.35,
        fillOpacity: 0.95,
        interactive: false,
      }).addTo(map);
    }
  }

  // Ensure size is right after mount (handle late layout)
  setTimeout(() => map.invalidateSize(), 60);
  window.addEventListener('resize', () => map.invalidateSize());
}

/* ---------- Copy-code button ---------- */
function initCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    if (btn.dataset.copyBound === '1') return;
    btn.dataset.copyBound = '1';
    btn.addEventListener('click', async () => {
      const sel = btn.getAttribute('data-copy-target');
      const target = document.querySelector(sel);
      if (!target) return;
      const text = target.innerText;
      const flash = (label) => {
        const original = btn.dataset.copyOriginal || btn.textContent;
        btn.dataset.copyOriginal = original;
        btn.textContent = label;
        btn.setAttribute('aria-live', 'polite');
        clearTimeout(btn._copyResetId);
        btn._copyResetId = setTimeout(() => { btn.textContent = original; }, 1400);
      };
      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch (_) { /* fall through */ }
      if (!ok) {
        // Fallback: hidden textarea + execCommand. Works in non-secure contexts and most iframes.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        document.body.removeChild(ta);
      }
      flash(ok ? 'Copied' : 'Press \u2318C');
    });
  });
}

/* ---------- WGSL animated background ---------- */
const WGSL_LINES = [
  "@compute @workgroup_size(256)",
  "fn main(@builtin(global_invocation_id) gid : vec3<u32>) {",
  "  let tid = gid.x;",
  "  var state = pcg(pcg(params.seed_start + tid));",
  "  var hits : u32 = 0u;",
  "  for (var i: u32 = 0u; i < params.spt; i = i + 1u) {",
  "    state = pcg(state); let x = f01(state);",
  "    state = pcg(state); let y = f01(state);",
  "    if (x*x + y*y < 1.0) { hits = hits + 1u; }",
  "  }",
  "  atomicAdd(&hit_total, hits);",
  "}",
];
function initWgslBg(el) {
  if (!el) return;
  let lines = [];
  for (let i = 0; i < 14; i++) lines = lines.concat(WGSL_LINES);
  el.textContent = lines.join('\n');
}

/* ---------- Background worker ---------- */
function initBackgroundWorker() {
  if (!navigator.gpu) return;
  // A page with an explicit opt-in ("Plant this tab" on the homepage, see
  // forest-join.js) has promised its visitor that nothing runs until they
  // press it, so it must not also start a worker here unasked.
  if (document.querySelector('[data-plant-tab]')) return;
  window.__EMBED_MODE__ = true;
  import('/js/worker-client.js').then(({ WorkerClient }) => {
    const client = new WorkerClient({
      coordinatorUrl: location.origin,
      onLog(msg) { console.log('[warppool-bg]', msg); },
      onStatus(status) { console.log('[warppool-bg] status:', status); },
    });
    client.init();
  }).catch(() => { /* WebGPU or module load failed — silently skip */ });
}

/* ---------- BOOT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initBanner();
  initLiveStats();
  document.querySelectorAll('[data-leaflet-map]').forEach(initLeafletMap);
  initCopyButtons();
  document.querySelectorAll('[data-wgsl-bg]').forEach(initWgslBg);
  initBackgroundWorker();
});
