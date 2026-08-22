import { securityHeaders } from "../src/lib/security";

function testSecurityHeaders() {
  const headers = securityHeaders();
  if (!headers["Strict-Transport-Security"]) {
    throw new Error("Missing Strict-Transport-Security header");
  }
  if (headers["Strict-Transport-Security"] !== "max-age=31536000; includeSubDomains; preload") {
    throw new Error(`Unexpected HSTS header value: ${headers["Strict-Transport-Security"]}`);
  }
  console.log("✅ Security headers test passed successfully!");
}

testSecurityHeaders();
