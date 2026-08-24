import { STAGES } from "./d1-shared";
import type { PortalPayload } from "./types";

export const emptyPayload: PortalPayload = {
  config: {
    employee: { name: "", company: "", role: "", email: "", phone: "", empId: "", bank: "" },
    company: { name: "", tagline: "", address: "", contact: "", legal: "" },
    payroll: { period: "", ref: "", stage: 1, payday: "", paydayShort: "" },
    stages: STAGES,
    payslips: [],
    ads: [],
    notifications: [],
  },
  ewa: {
    rules: {
      feeRate: 0.03,
      minFee: 50000,
      minFeeAmount: 1750000,
      maxTenorMonths: 1,
      maxPercent: 0.3,
      minDaysWorked: 10,
      minTenureMonths: 1,
      minTenureDays: 0,
    },
    emp: { daysWorked: 0, tenureMonths: 0 },
    app: null,
    history: [],
  },
};
