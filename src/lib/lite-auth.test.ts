import assert from "node:assert/strict";
import test from "node:test";
import {
  constantTimeEqual, liteApiBase, loginOnLite, pinFallbackEnabled, validateNewPassword,
} from "./lite-auth.ts";

test("Lite API base strips trailing slash", () => {
  assert.equal(liteApiBase({ LITE_API_BASE: "https://proqpay-lite.pages.dev/" }), "https://proqpay-lite.pages.dev");
});

test("PIN fallback is off unless explicitly enabled", () => {
  assert.equal(pinFallbackEnabled({}), false);
  assert.equal(pinFallbackEnabled({ PORTAL_PIN_FALLBACK: "0" }), false);
  assert.equal(pinFallbackEnabled({ PORTAL_PIN_FALLBACK: "1" }), true);
});

test("new password policy matches Lite", () => {
  assert.match(validateNewPassword("short") || "", /minimal 12/);
  assert.match(validateNewPassword("longpasswordonly") || "", /huruf besar/);
  assert.equal(validateNewPassword("PortalBaru!2026Aa"), null);
});

test("constant-time compare rejects mismatched PIN", () => {
  assert.equal(constantTimeEqual("proqpay", "proqpay"), true);
  assert.equal(constantTimeEqual("proqpay", "wrong"), false);
});

test("loginOnLite maps a successful Lite session", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({
      ok: true,
      emp_id: "EMP-209200339",
      emp_code: "EMP-209200339",
      emp_name: "ABDUL AZIZ",
      client_id: "CLI-QJOB",
      org_id: "ORG-OTSINDO",
      mustChangePassword: true,
      token: "lite-session-token",
    }), { status: 200 })) as typeof fetch;
  const result = await loginOnLite(
    { LITE_API_BASE: "https://proqpay-lite.pages.dev", EMPLOYEE_PORTAL_KEY: "secret" },
    { empId: "209200339", password: "NOCP120200920", origin: "https://proqpay-ess.arywibowo.workers.dev" },
    fetchImpl,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.token, "lite-session-token");
    assert.equal(result.mustChangePassword, true);
  }
});

test("loginOnLite does not leak whether the employee exists", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ error: "Employee ID atau password tidak valid" }), { status: 401 })) as typeof fetch;
  const result = await loginOnLite(
    { LITE_API_BASE: "https://proqpay-lite.pages.dev" },
    { empId: "NO-SUCH", password: "x", origin: "https://ess.example" },
    fetchImpl,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 401);
    assert.equal(result.unreachable, false);
  }
});

test("loginOnLite treats network failure as unreachable", async () => {
  const fetchImpl = (async () => {
    throw new Error("network");
  }) as typeof fetch;
  const result = await loginOnLite(
    { LITE_API_BASE: "https://proqpay-lite.pages.dev" },
    { empId: "209200339", password: "x", origin: "https://ess.example" },
    fetchImpl,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.unreachable, true);
});
