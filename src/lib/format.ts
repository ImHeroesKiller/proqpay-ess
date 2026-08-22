const EN_MONTHS: Record<string, string> = {
  Januari: "January",
  Februari: "February",
  Maret: "March",
  April: "April",
  Mei: "May",
  Juni: "June",
  Juli: "July",
  Agustus: "August",
  September: "September",
  Oktober: "October",
  November: "November",
  Desember: "December",
};
const ID_MONTHS: Record<string, string> = {
  Januari: "01",
  Februari: "02",
  Maret: "03",
  April: "04",
  Mei: "05",
  Juni: "06",
  Juli: "07",
  Agustus: "08",
  September: "09",
  Oktober: "10",
  November: "11",
  Desember: "12",
};

export function fmt(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function totalOf(rows: [string, number][]) {
  return rows.reduce((s, r) => s + r[1], 0);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function enPeriod(p: string) {
  return String(p).replace(/^\w+/, (m) => EN_MONTHS[m] || m);
}

export function slipRef(idx: number, period: string) {
  const p = period.split(" ");
  const mm = ID_MONTHS[p[0]] || "01";
  return "PYRL-" + mm + (p[1] || "26").slice(2) + "-" + String(421 + idx).padStart(5, "0");
}
