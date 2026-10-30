import test from "node:test";
import assert from "node:assert/strict";
import { payrollPaymentSummary } from "./payment-summary.ts";

test("paid uses actual proof date rather than planned date", () => {
  const result = payrollPaymentSummary({ stage: 5, paymentStatus: "PAID", paidOn: "2026-10-30", estimatedPayOn: "2026-10-25", payday: "25 Oct" });
  assert.equal(result.status, "Paid");
  assert.equal(result.dateLabel, "Tanggal bayar");
  assert.equal(result.date, "30 Oktober 2026");
});
test("unpaid uses estimated date even when historical payslips exist", () => {
  const result = payrollPaymentSummary({ stage: 4, paymentStatus: "UNPAID", estimatedPayOn: "2026-11-10", payday: "10 Nov" });
  assert.equal(result.status, "Unpaid");
  assert.equal(result.date, "10 November 2026");
  assert.equal(result.dateLabel, "Estimasi tanggal bayar");
});
test("missing or invalid actual date never becomes the scheduled date", () => {
  for (const paidOn of [null, "2026-02-30", "invalid"]) {
    assert.equal(payrollPaymentSummary({ stage: 5, paidOn, payday: "1 Jan" }).date, "Tanggal pembayaran belum tercatat");
  }
  assert.equal(payrollPaymentSummary({ stage: 1, payday: "—" }).date, "Belum dijadwalkan");
});
test("explicit backend unpaid overrides legacy closed stage", () => {
  assert.equal(payrollPaymentSummary({ stage: 5, paymentStatus: "UNPAID", payday: "—" }).status, "Unpaid");
});
