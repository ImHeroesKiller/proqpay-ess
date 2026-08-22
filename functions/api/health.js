import { json, onOptions } from "./_shared.js";

export function onRequestOptions({ request }) {
  return onOptions(request);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, d1: "unbound" }, 503, request);
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM employees").first();
    return json({ ok: true, d1: "ok", employees: Number(row?.n || 0) }, 200, request);
  } catch (err) {
    return json({ ok: false, d1: "error", message: String(err && err.message ? err.message : err) }, 500, request);
  }
}
