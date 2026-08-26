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
