import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const portal = readFileSync("src/components/ess-portal.tsx", "utf8");
const css = readFileSync("src/styles/portal.css", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

test("portal theme follows user preference instead of forcing dark", () => {
  assert.doesNotMatch(portal, /classList\.add\("dark"\)/);
  assert.match(portal, /proqpay-ess-theme/);
  assert.match(portal, /classList\.toggle\("dark"/);
  assert.doesNotMatch(layout, /className="dark"/);
});

test("login has accessible labels and no fake forgot-password action", () => {
  assert.match(portal, /htmlFor="lgEmployee"/);
  assert.match(portal, /htmlFor="lgPass"/);
  assert.doesNotMatch(portal, /Forgot password\?/);
  assert.match(portal, /Hubungi HR perusahaan Anda/);
});

test("login controls retain focus visibility", () => {
  assert.match(css, /\.lg-theme:focus-visible/);
  assert.match(css, /\.lg-input:focus-visible/);
});
