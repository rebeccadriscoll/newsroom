// Cloudflare Pages Function — same-origin proxy to the Beehiiv v2 API.
// The page calls POST /api/beehiiv with { path, method, body } and this
// function attaches your Beehiiv key and forwards to api.beehiiv.com.
// Your key never reaches the browser.
//
// SETUP: in your Pages project → Variables and Secrets, add a SECRET named
//   BEEHIIV_API_KEY  (create it in Beehiiv → Settings → API).
// You also need your Publication ID (looks like pub_xxxxxxxx) — that goes in
// the newsroom's Settings, not here (it isn't secret).

const HOST = "https://api.beehiiv.com";

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.BEEHIIV_API_KEY;
  if (!key) return json({ error: { message: "Missing BEEHIIV_API_KEY secret." } }, 500);

  let req;
  try { req = await request.json(); } catch { return json({ error: { message: "Bad JSON." } }, 400); }

  const path = String(req.path || "");
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
    return json({ error: { message: "Beehiiv request failed: " + (e && e.message ? e.message : String(e)) } }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
