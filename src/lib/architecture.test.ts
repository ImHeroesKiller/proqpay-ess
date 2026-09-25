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


test("Employee Services P2 surfaces session recovery and readable EWA lifecycle", () => {
  const portal = read("src/components/ess-portal.tsx");
  const card = read("src/components/ewa-lifecycle-card.tsx");
  const lifecycle = read("src/lib/employee-services.ts");
  const css = read("src/styles/portal.css");
  assert.match(portal, /loadSession/);
  assert.match(portal, /Coba lagi/);
  assert.match(portal, /EwaLifecycleCard/);
  assert.match(card, /Perbarui status/);
  assert.match(lifecycle, /Menunggu persetujuan/);
  assert.match(lifecycle, /Sudah dicairkan/);
  assert.match(lifecycle, /Diproses di payroll/);
  assert.match(css, /ewa-life/);
});

test("Employee Services P2 preserves mobile-first UX and adds a bounded desktop layout", () => {
  const css = read("src/styles/portal.css");
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /max-width: 1180px/);
  assert.match(css, /@media \(max-width: 560px\)/);
});


test("Employee Services P3 contract manifest matches ESS runtime lifecycle", () => {
  const manifest = JSON.parse(read("employee-services-contract.json")) as { version: string; ewaStatuses: string[] };
  const auth = read("src/lib/lite-auth.ts");
  const lifecycle = read("src/lib/employee-services.ts");
  assert.ok(auth.includes(manifest.version));
  for (const status of manifest.ewaStatuses) assert.ok(lifecycle.includes(status));
});

test("Employee Services P3 extracts lifecycle presentation from monolithic portal", () => {
  const portal = read("src/components/ess-portal.tsx");
  const card = read("src/components/ewa-lifecycle-card.tsx");
  assert.match(portal, /EwaLifecycleCard/);
  assert.doesNotMatch(portal, /function ewaStatusMeta/);
  assert.match(card, /ewaStatusMeta/);
  assert.match(card, /aria-live="polite"/);
});

test("Employee Services P3 dialog and interactive profile controls are keyboard accessible", () => {
  const portal = read("src/components/ess-portal.tsx");
  const css = read("src/styles/portal.css");
  assert.match(portal, /aria-modal="true"/);
  assert.match(portal, /event\.key === "Escape"/);
  assert.match(portal, /aria-label="Buka profil karyawan"/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});


test("Employee Services UI P1 uses Indonesian payroll labels and semantic interactive rows", () => {
  const portal = read("src/components/ess-portal.tsx");
  assert.match(portal, /Halo,/);
  assert.match(portal, /Gaji bersih/);
  assert.match(portal, /Tanggal gajian/);
  assert.match(portal, /Status Payroll/);
  assert.match(portal, /Riwayat Slip Gaji/);
  assert.match(portal, /<button type="button" className="hist-item"/);
  assert.match(portal, /<button type="button" className="help-item"/);
  assert.doesNotMatch(portal, /<div className="hist-item"/);
  assert.doesNotMatch(portal, /<div className="help-item"/);
});


test("Employee Services UI P2 provides a true desktop workspace and mobile-first responsive hierarchy", () => {
  const portal = read("src/components/ess-portal.tsx");
  const css = read("src/styles/portal.css");
  assert.match(portal, /desktop-nav/);
  assert.match(portal, /ess-payroll/);
  assert.match(portal, /ess-ewa/);
  assert.match(portal, /ess-history/);
  assert.match(portal, /promo-slot/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.55fr\) minmax\(320px, \.75fr\)/);
  assert.match(css, /\.tabbar \{ display: none !important; \}/);
  assert.match(css, /\.stats \.stat:first-child \{ grid-column: 1 \/ -1; \}/);
});

test("Employee Services UI P2 explains disabled Advance Salary and removes redundant payroll status chips", () => {
  const portal = read("src/components/ess-portal.tsx");
  assert.match(portal, /ewa-locked-reason/);
  assert.match(portal, /Advance Salary belum tersedia/);
  assert.doesNotMatch(portal, /Salary paid to your account/);
  assert.doesNotMatch(portal, /Awaiting payout/);
  assert.doesNotMatch(portal, /In review & approval/);
  assert.doesNotMatch(portal, /Awaiting payroll data from your company/);
});
