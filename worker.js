/**
 * CloudPress 미러링 Worker v10
 * GitHub: choichoi3227-crypto/cp-e9e3c0ba-test100991
 *
 * 요청 처리 순서:
 *   1. 정적 파일(.css/.js/이미지) → GitHub 레포 raw / WordPress CDN
 *   2. KV HTML 캐시 (비로그인 GET)
 *   3. PHP_RUNNER Service Binding → php-wasm WordPress 실행  ← 핵심
 *   4. _cache/ 정적 HTML → GitHub 레포 (PHP_RUNNER 없을 때 폴백)
 *   5. GitHub Pages 폴백
 *   6. 없으면 404 (고정 화면 절대 없음)
 */

const SITE_ID      = "e9e3c0ba-5b01-46d7-8ecf-f8fcb0f1d810";
const GH_OWNER     = "choichoi3227-crypto";
const GH_REPO      = "cp-e9e3c0ba-test100991";
const GH_BRANCH    = "main";
const GH_PAGES_URL = "https://choichoi3227-crypto.github.io/cp-e9e3c0ba-test100991";

const STATIC_EXT = /\.(css|js|mjs|jpg|jpeg|png|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|map|txt|xml|pdf|zip|mp4|mp3|ogg|wav|webm|gz|br)$/i;
const SKIP_CACHE = ["/wp-admin", "/wp-login.php", "/cart", "/checkout", "/my-account", "/wp-cron.php", "/xmlrpc.php"];
const SEC        = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "strict-origin-when-cross-origin" };

const ghOwner = (e) => e.GH_OWNER  || GH_OWNER;
const ghRepo  = (e) => e.GH_REPO   || GH_REPO;
const ghToken = (e) => e.GITHUB_TOKEN || "";
const ghPages = (e) => e.GH_PAGES_URL || GH_PAGES_URL || "";
const getSiteId = (e) => e.SITE_ID || SITE_ID;

const kvGet    = async (e,k) => { try { return await e.CACHE?.get(k); }               catch { return null; } };
const kvGetBuf = async (e,k) => { try { return await e.CACHE?.get(k,"arrayBuffer"); } catch { return null; } };
const kvPut    = async (e,k,v,t=3600) => { try { await e.CACHE?.put(k,v,{expirationTtl:t}); } catch {} };

function mime(p) {
  const ext = (p.split(".").pop() || "").toLowerCase();
  return ({
    css:"text/css", js:"application/javascript", mjs:"application/javascript",
    json:"application/json", html:"text/html;charset=utf-8", xml:"application/xml",
    svg:"image/svg+xml", png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg",
    gif:"image/gif", webp:"image/webp", avif:"image/avif", ico:"image/x-icon",
    woff:"font/woff", woff2:"font/woff2", ttf:"font/ttf", otf:"font/otf",
    eot:"application/vnd.ms-fontobject", pdf:"application/pdf",
    mp4:"video/mp4", mp3:"audio/mpeg", txt:"text/plain",
  })[ext] || "application/octet-stream";
}

// GitHub 레포 raw 파일 fetch
async function ghRaw(env, filePath) {
  const o = ghOwner(env), r = ghRepo(env), t = ghToken(env);
  if (!o || !r) return null;
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${o}/${r}/${GH_BRANCH}/${filePath}`,
      { headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), "User-Agent": "CloudPress/10" },
        cf: { cacheEverything: true, cacheTtl: 300 } }
    );
    return res.ok ? res : null;
  } catch { return null; }
}

// WordPress 코어 파일 CDN fetch
async function wpCdn(filePath) {
  for (const base of [
    "https://cdn.jsdelivr.net/gh/WordPress/WordPress@master/",
    "https://raw.githubusercontent.com/WordPress/WordPress/master/",
  ]) {
    try {
      const r = await fetch(base + filePath, { cf: { cacheEverything: true, cacheTtl: 86400 } });
      if (r.ok) return r;
    } catch {}
  }
  return null;
}

// PHP_RUNNER Service Binding으로 WordPress PHP 실행
async function runPhp(req, env, ctx) {
  if (!env.PHP_RUNNER) return null;
  const url    = new URL(req.url);
  const method = req.method.toUpperCase();
  const sid    = getSiteId(env);
  const noCache = SKIP_CACHE.some(p => url.pathname.startsWith(p))
    || (req.headers.get("Cookie") || "").includes("wordpress_logged_in");
  const body = (method === "POST" || method === "PUT" || method === "PATCH")
    ? await req.text().catch(() => "") : "";
  try {
    const res = await env.PHP_RUNNER.fetch(new Request("https://php-runner/run-wordpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phpFile: url.pathname === "/" ? "/index.php" : url.pathname,
        phpEnv: {
          REQUEST_METHOD:       method,
          REQUEST_URI:          url.pathname + url.search,
          QUERY_STRING:         url.search.slice(1),
          HTTP_HOST:            url.hostname,
          SERVER_NAME:          url.hostname,
          SERVER_PORT:          "443",
          HTTPS:                "on",
          DOCUMENT_ROOT:        "/var/www/wordpress",
          SCRIPT_FILENAME:      `/var/www/wordpress${url.pathname === "/" ? "/index.php" : url.pathname}`,
          SCRIPT_NAME:          url.pathname === "/" ? "/index.php" : url.pathname,
          PHP_SELF:             url.pathname === "/" ? "/index.php" : url.pathname,
          GATEWAY_INTERFACE:    "CGI/1.1",
          SERVER_PROTOCOL:      "HTTP/1.1",
          HTTP_USER_AGENT:      req.headers.get("User-Agent") || "",
          HTTP_ACCEPT:          req.headers.get("Accept") || "",
          HTTP_ACCEPT_LANGUAGE: req.headers.get("Accept-Language") || "",
          HTTP_COOKIE:          req.headers.get("Cookie") || "",
          HTTP_REFERER:         req.headers.get("Referer") || "",
          CONTENT_TYPE:         req.headers.get("Content-Type") || "",
          CONTENT_LENGTH:       req.headers.get("Content-Length") || "",
          HTTP_AUTHORIZATION:   req.headers.get("Authorization") || "",
          HTTP_X_FORWARDED_FOR: req.headers.get("CF-Connecting-IP") || "",
          WP_HOME:              `https://${url.hostname}`,
          WP_SITEURL:           `https://${url.hostname}`,
        },
        stdin: body,
        siteConfig: { siteId: sid, githubOwner: ghOwner(env), githubRepo: ghRepo(env), githubToken: ghToken(env) },
        skipCache: noCache,
      }),
    }));
    if (!res.ok && res.status !== 503 && res.status >= 500) return null;
    if (!noCache && method === "GET" && res.ok && res.headers.get("Content-Type")?.includes("text/html")) {
      const html = await res.clone().text();
      ctx.waitUntil(kvPut(env, `php:${sid}:${url.pathname}${url.search}`, html, 3600));
    }
    return res;
  } catch { return null; }
}

export default {
  async fetch(req, env, ctx) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const method = req.method.toUpperCase();
    const sid    = getSiteId(env);

    // CORS
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-WP-Nonce",
    }});

    // 헬스체크
    if (path === "/_health") return new Response(
      JSON.stringify({ ok: true, site: sid, php: !!env.PHP_RUNNER, kv: !!env.CACHE }),
      { headers: { "Content-Type": "application/json" } }
    );

    // ── 1. 정적 파일 ────────────────────────────────────────────────────────
    if (STATIC_EXT.test(path)) {
      const fp = path.slice(1);
      const ckey = `static:${sid}:${fp}`;
      const cached = await kvGetBuf(env, ckey);
      if (cached) return new Response(cached, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=3600", "X-Cache": "HIT", ...SEC }});
      const gr = await ghRaw(env, fp);
      if (gr) {
        const buf = await gr.arrayBuffer();
        ctx.waitUntil(kvPut(env, ckey, buf, path.startsWith("/wp-content/") ? 3600 : 86400));
        return new Response(buf, { headers: {
          "Content-Type": mime(fp),
          "Cache-Control": path.startsWith("/wp-content/") ? "public,max-age=3600" : "public,max-age=86400,immutable",
          ...SEC,
        }});
      }
      if (path.startsWith("/wp-includes/") || path.startsWith("/wp-admin/")) {
        const cr = await wpCdn(fp);
        if (cr) {
          const buf = await cr.arrayBuffer();
          ctx.waitUntil(kvPut(env, ckey, buf, 86400));
          return new Response(buf, { headers: { "Content-Type": mime(fp), "Cache-Control": "public,max-age=86400,immutable", ...SEC }});
        }
      }
      return new Response("Not Found", { status: 404 });
    }

    const isLoggedIn = (req.headers.get("Cookie") || "").includes("wordpress_logged_in");
    const cacheable  = method === "GET" && !SKIP_CACHE.some(p => path.startsWith(p)) && !isLoggedIn;

    // ── 2. KV HTML 캐시 ─────────────────────────────────────────────────────
    if (cacheable) {
      const cached = await kvGet(env, `php:${sid}:${path}${url.search}`);
      if (cached) return new Response(cached, { headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Cache-Control": "public,s-maxage=60,stale-while-revalidate=3600",
        "X-Cache": "HIT", ...SEC,
      }});
    }

    // ── 3. PHP_RUNNER → WordPress 실행 (핵심) ───────────────────────────────
    const phpRes = await runPhp(req, env, ctx);
    if (phpRes) return phpRes;

    // ── 4. _cache/ 정적 HTML (PHP_RUNNER 없거나 실패 시) ────────────────────
    if (cacheable) {
      const cachePath = (path === "/" || path === "")
        ? "_cache/index.html"
        : `_cache${path.endsWith("/") ? path : path + "/"}index.html`;
      const cr = await ghRaw(env, cachePath);
      if (cr) {
        const html = await cr.text();
        ctx.waitUntil(kvPut(env, `php:${sid}:${path}${url.search}`, html, 1800));
        return new Response(html, { headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "public,s-maxage=60,stale-while-revalidate=1800",
          "X-Fallback": "gh-cache", ...SEC,
        }});
      }
    }

    // ── 5. GitHub Pages 폴백 ────────────────────────────────────────────────
    const pagesUrl = ghPages(env);
    if (pagesUrl && cacheable) {
      try {
        const r = await fetch(`${pagesUrl}${path}`, {
          cf: { cacheEverything: true, cacheTtl: 300 },
          headers: { "User-Agent": "CloudPress/10" },
        });
        if (r.ok) {
          const html = await r.text();
          return new Response(html, { headers: {
            "Content-Type": "text/html;charset=utf-8",
            "Cache-Control": "public,max-age=60",
            "X-Fallback": "github-pages", ...SEC,
          }});
        }
      } catch {}
    }

    // ── 6. KV stale ─────────────────────────────────────────────────────────
    const stale = await kvGet(env, `php:${sid}:${path}${url.search}`);
    if (stale) return new Response(stale, { headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public,max-age=30",
      "X-Fallback": "kv-stale", ...SEC,
    }});

    // ── 7. 설치 중 페이지 또는 404 ──────────────────────────────────────────
    // GH_OWNER/GH_REPO가 있으면 아직 WordPress 설치 중 (GitHub Actions 대기 중)
    if (ghOwner(env) && ghRepo(env)) {
      const _repoUrl    = `https://github.com/${ghOwner(env)}/${ghRepo(env)}`;
      const _actionsUrl = `${_repoUrl}/actions`;
      const _html = [
        '<!DOCTYPE html><html lang="ko"><head>',
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
        '<meta http-equiv="refresh" content="30">',
        '<title>WordPress 설치 중 — CloudPress</title>',
        '<style>',
        '*{box-sizing:border-box;margin:0;padding:0}',
        'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}',
        '.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}',
        '.spinner{width:56px;height:56px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 28px}',
        '@keyframes spin{to{transform:rotate(360deg)}}',
        'h1{font-size:22px;font-weight:700;color:#111827;margin-bottom:12px}',
        'p{font-size:15px;color:#6b7280;line-height:1.6;margin-bottom:8px}',
        '.steps{background:#f9fafb;border-radius:10px;padding:20px 24px;margin:24px 0;text-align:left}',
        '.step{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#374151;padding:6px 0;border-bottom:1px solid #f3f4f6}',
        '.step:last-child{border-bottom:none}',
        '.dot{width:8px;height:8px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:5px;animation:pulse 1.5s ease-in-out infinite}',
        '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}',
        'a{color:#2563eb;text-decoration:none;font-weight:500}a:hover{text-decoration:underline}',
        '.note{font-size:13px;color:#9ca3af;margin-top:20px}',
        '</style></head><body>',
        '<div class="card">',
        '<div class="spinner"></div>',
        '<h1>WordPress 설치 중입니다</h1>',
        '<p>GitHub Actions가 WordPress를 자동으로 설치하고 있습니다.<br>보통 3~5분 정도 소요됩니다.</p>',
        '<div class="steps">',
        '<div class="step"><span class="dot"></span><span>WordPress 파일 다운로드 및 설치</span></div>',
        '<div class="step"><span class="dot"></span><span>SQLite 데이터베이스 초기화</span></div>',
        '<div class="step"><span class="dot"></span><span>WordPress 기본 설정 완료</span></div>',
        '</div>',
        `<p><a href="${_actionsUrl}" target="_blank">GitHub Actions 진행상황 확인 →</a></p>`,
        '<p class="note">이 페이지는 30초마다 자동으로 새로고침됩니다</p>',
        '</div></body></html>',
      ].join('');
      return new Response(_html, { status: 503, headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Retry-After': '30',
        'Cache-Control': 'no-store',
      }});
    }

    return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain", ...SEC }});
  }
};