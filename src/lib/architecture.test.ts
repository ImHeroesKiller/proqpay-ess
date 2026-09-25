import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("portal login and init do not depend on direct D1 portal fallback", () => {
  const login = read("src/app/api/portal/login/route.ts");
  const init = read("src/app/api/portal/init/route.ts");

  for (const source of [login, init]) {
    assert.doesNotMatch(source, /d1-portal/);
    assert.doesNotMatch(source, /env\.DB/);
  }

  assert.equal(existsSync(resolve(root, "src/lib/d1-portal.ts")), false);
});

test("ESS health checks Lite instead of shared D1", () => {
  const health = read("src/app/api/health/route.ts");
  assert.match(health, /\/api\/health/);
  assert.doesNotMatch(health, /env\.DB/);
});

test("Payslip History consumes canonical final submission register", () => {
  const init = read("src/app/api/portal/init/route.ts");
  assert.match(init, /\/api\/employee\/payslips/);
  assert.match(init, /slip\.status === "paid"/);
  assert.match(init, /estimatedPayslips/);
  assert.match(init, /Regular \+ Adjustment \+ Off-cycle/);
});

test("EWA submit is canonical, refreshes state, and blocks duplicate clicks", () => {
  const portal = read("src/components/ess-portal.tsx");
  assert.match(portal, /action: "SUBMIT"/);
  assert.match(portal, /if \(!wiz\.agreed \|\| ewaBusy\) return/);
  assert.match(portal, /cache: "no-store"/);
  assert.match(portal, /disabled=\{!wiz\.agreed \|\| !eligible \|\| ewaBusy\}/);
  assert.match(portal, /role="alert"/);
});


test("ESS fails closed when the ProQPay Lite Employee Services contract drifts", () => {
  const auth = read("src/lib/lite-auth.ts");
  const init = read("src/app/api/portal/init/route.ts");
  const ewa = read("src/app/api/portal/ewa/route.ts");
  assert.match(auth, /EMPLOYEE_SERVICES_CONTRACT_VERSION = "2026-09-v1"/);
  assert.match(init, /body\.contractVersion !== EMPLOYEE_SERVICES_CONTRACT_VERSION/);
  assert.match(init, /data\.contractVersion !== EMPLOYEE_SERVICES_CONTRACT_VERSION/);
  assert.match(ewa, /data\.contractVersion !== EMPLOYEE_SERVICES_CONTRACT_VERSION/);
  assert.match(init, /status: 502/);
});

test("ESS CSP removes unsafe-eval while allowing configured HTTPS ad images and tracking pixels", () => {
  const security = read("src/lib/security.ts");
  assert.doesNotMatch(security, /unsafe-eval/);
  assert.match(security, /img-src 'self' data: https:/);
  assert.match(security, /object-src 'none'/);
  assert.match(security, /Cross-Origin-Opener-Policy/);
});
