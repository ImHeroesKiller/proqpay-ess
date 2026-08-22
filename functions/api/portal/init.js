import { buildPortalPayload, findEmployee } from "../_portal.js";
import { json, onOptions, requireEmployee } from "../_shared.js";

export function onRequestOptions({ request }) {
  return onOptions(request);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "D1 belum di-bind (env.DB)." }, 503, request);
  const auth = await requireEmployee(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status, request);

  const employee = await findEmployee(env.DB, auth.payload.sub);
  if (!employee) return json({ error: "Karyawan tidak ditemukan." }, 404, request);

  const payload = await buildPortalPayload(env.DB, employee);
  return json(payload, 200, request);
}
