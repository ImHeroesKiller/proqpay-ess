export type Payslip = { period: string; status: "processing" | "paid"; rows: [string, number][] };
export type Stage = { title: string; desc: string; meta: string; note: string; eta: string };
export type Ad = {
  tag: string;
  title: string;
  desc: string;
  cta: string;
  bg: string;
  href?: string;
  action?: "NONE" | "EWA" | "PAYSLIP" | "EXTERNAL" | string;
  imageUrl?: string;
  impressionUrl?: string;
  clickUrl?: string;
  provider?: string;
  placement?: "HOME" | "EWA" | "PAYSLIP" | string;
};
export type Notif = { title: string; s: string; type: "a" | "g"; unread: boolean };
export type EwaApp = {
  ref: string;
  amount: number;
  fee: number;
  method: string;
  inst: number;
  date: string;
  status: string;
} | null;
export type EwaHistory = { ref: string; date: string; amount: number; status: string };

export type PortalCopy = {
  companyTagline?: string;
  heroSubtitle?: string;
  ewaTitle?: string;
  ewaSubtitle?: string;
  ewaBody?: string;
  ewaCta?: string;
  ewaLimitCaption?: string;
};

export type AdsPlatform = {
  provider?: string;
  accountId?: string;
  pixelId?: string;
  conversionLabel?: string;
  impressionUrl?: string;
};

export type PortalConfig = {
  employee: {
    name: string;
    company: string;
    role: string;
    email: string;
    phone: string;
    empId: string;
    bank: string;
  };
  company: { name: string; tagline: string; address: string; contact: string; legal: string };
  payroll: { period: string; ref: string; stage: number; payday: string; paydayShort: string };
  stages: Stage[];
  payslips: Payslip[];
  ads: Ad[];
  notifications: Notif[];
  copy?: PortalCopy;
  features?: { adsEnabled?: boolean };
  adsPlatform?: AdsPlatform;
};

export type EwaState = {
  rules: {
    feeRate: number;
    minFee: number;
    minFeeAmount: number;
    maxTenorMonths: number;
    maxPercent: number;
    minDaysWorked: number;
    minTenureMonths?: number;
    enabled?: boolean;
  };
  emp: { daysWorked: number; tenureMonths: number; daysInMonth?: number; net?: number };
  plafond?: number;
  eligible?: boolean;
  reason?: string;
  app: EwaApp;
  history: EwaHistory[];
};

export type PortalPayload = { config: PortalConfig; ewa: EwaState; mustChangePassword?: boolean };
