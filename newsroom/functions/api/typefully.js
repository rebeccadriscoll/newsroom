// Cloudflare Pages Function — same-origin proxy to the Typefully v2 API.
// The page calls POST /api/typefully with { path, method, body } and this
// function attaches your Typefully key and forwards to api.typefully.com.
// Your key never reaches the browser.
//
// SETUP: in your Pages project → Variables and Secrets, add a SECRET named
//   TYPEFULLY_API_KEY  (create the key in Typefully → Settings → API).
// Typefully v1 is deprecated 15 June 2026 — this uses v2 only.

const HOST = "https://api.typefully.com";

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.TYPEFULLY_API_KEY;
  if (!key) return json({ error: { message: "Missing TYPEFULLY_API_KEY secret." } }, 500);

  let req;
  try { req = await request.json(); } catch { return json({ error: { message: "Bad JSON." } }, 400); }

  const path = String(req.path || "");
  // Only allow Typefully API paths — never forward elsewhere.
  if (!path.startsWith("/v2/")) return json({ error: { message: "path must start with /v2/" } }, 400);

  try {
    const upstream = await fetch(HOST + path, {
      method: req.method || "GET",
      headers: { "content-type": "application/json", "Authorization": "Bearer " + key },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers: { "content-type": "application/json" } });
  } catch (e) {
    return json({ error: { message: "Typefully request failed: " + (e && e.message ? e.message : String(e)) } }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
