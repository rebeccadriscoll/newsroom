// Cloudflare Pages Function — same-origin proxy to the Anthropic API.
// Your page calls POST /api/claude; this function adds your secret key and
// forwards the request to Anthropic. The key NEVER ships to the browser.
//
// SETUP (one time):
//   1. Deploy this whole folder to Cloudflare Pages.
//   2. In the Pages project: Settings → Variables and Secrets →
//      add a SECRET named  ANTHROPIC_API_KEY  with your Anthropic key.
//   3. Redeploy. Done.

export async function onRequestPost(context) {
  const { request, env } = context;

  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return json({ error: { message: "Missing ANTHROPIC_API_KEY secret in your Cloudflare Pages project." } }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: { message: "Request body was not valid JSON." } }, 400);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return json({ error: { message: "Upstream request failed: " + (e && e.message ? e.message : String(e)) } }, 502);
  }
}

// Optional: a friendly response if someone GETs the endpoint in a browser.
export async function onRequestGet() {
  return json({ ok: true, hint: "POST your Anthropic /v1/messages payload here." });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
