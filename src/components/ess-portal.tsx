"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "./icon";
import { emptyPayload } from "@/lib/empty-portal";
import { enPeriod, fmt, initials, slipRef, totalOf } from "@/lib/format";
import type { EwaApp, EwaState, Payslip, PortalConfig, PortalPayload } from "@/lib/types";

const RING_C = 163.4;

type Modal = "payslip" | "profile" | "help" | "notify" | "ewa" | null;
type Tab = "home" | "slip" | "ewa" | "help" | "profile";

function ewaFee(amount: number, rules: EwaState["rules"]) {
  const pct = Math.round(amount * rules.feeRate);
  const min = amount <= rules.minFeeAmount ? rules.minFee : 0;
  return Math.max(pct, min);
}

function ewaPlafond(config: PortalConfig, ewa: EwaState) {
  const net = totalOf(config.payslips[0]?.rows || []);
  const days = new Date().getDate();
  const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const raw = net * Math.min(1, days / dim) * ewa.rules.maxPercent;
  return Math.floor(raw / 10000) * 10000;
}

export function EssPortal() {
  const [loaded, setLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [payload, setPayload] = useState<PortalPayload>(emptyPayload);
  const [stage, setStage] = useState(1);
  const [modal, setModal] = useState<Modal>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [slipIdx, setSlipIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [faqOpen, setFaqOpen] = useState(false);
  const [adHidden, setAdHidden] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [empInput, setEmpInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [remember, setRemember] = useState(true);
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changeErr, setChangeErr] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [ewaApp, setEwaApp] = useState<EwaApp>(null);
  const [wiz, setWiz] = useState({ step: 1, amount: 1000000, method: "auto", inst: 1, agreed: false });

  const config = payload.config;
  const ewa = { ...payload.ewa, app: ewaApp };
  const plafond = ewaPlafond(config, ewa);
  const eligible = ewa.emp.daysWorked >= ewa.rules.minDaysWorked && ewa.emp.tenureMonths >= 1;
  const processing = config.payslips[0]?.status !== "paid";
  const firstName = config.employee.name.split(" ")[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    fetch("/api/portal/init", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("no-session");
        return r.json();
      })
      .then((data: PortalPayload) => {
        setPayload(data);
        setStage(data.config.payroll.stage);
        setEwaApp(data.ewa.app);
        setMustChange(Boolean(data.mustChangePassword));
        setLoggedIn(true);
      })
      .catch(() => {})
      .finally(() => {
        window.setTimeout(() => setLoaded(true), 400);
      });
  }, []);

  async function doLogin() {
    setLoginErr("");
    setLoginBusy(true);
    const empId = empInput.trim();
    const pass = passInput;
    try {
      const r = await fetch("/api/portal/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: empId, password: pass, remember }),
      });
      if (r.status === 401) throw new Error("Employee ID atau password salah.");
      if (r.status === 429) throw new Error("Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.");
      if (r.status === 503) {
        const down = await r.json().catch(() => ({}));
        throw new Error(down.error || "Layanan login tidak tersedia.");
      }
      if (!r.ok) throw new Error("Gagal masuk ke server (" + r.status + ").");
      const loginData = await r.json().catch(() => ({}));
      const init = await fetch("/api/portal/init", { credentials: "include" });
      if (!init.ok) throw new Error("Login berhasil tetapi data D1 gagal dimuat.");
      const data: PortalPayload = await init.json();
      setPayload(data);
      setStage(data.config.payroll.stage);
      setEwaApp(data.ewa.app);
      setMustChange(Boolean(loginData.mustChangePassword || data.mustChangePassword));
      setPassInput("");
      setLoggedIn(true);
      setLoaded(true);
    } catch (e) {
      setLoginErr(e instanceof Error ? e.message : "Gagal masuk. Coba lagi.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function doChangePassword() {
    setChangeErr("");
    if (newPass !== confirmPass) {
      setChangeErr("Konfirmasi password tidak sama.");
      return;
    }
    setChangeBusy(true);
    try {
      const r = await fetch("/api/portal/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Gagal mengganti password.");
      showToast("Password diganti. Silakan masuk kembali.");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setChangeErr(e instanceof Error ? e.message : "Gagal mengganti password.");
    } finally {
      setChangeBusy(false);
    }
  }

  function logout() {
    fetch("/api/portal/logout", { method: "POST", credentials: "include" }).finally(() => {
      showToast("Anda telah keluar. Sampai jumpa!");
      window.location.reload();
    });
  }

  function openSlip(i: number) {
    setSlipIdx(i);
    setModal("payslip");
  }

  const slip = config.payslips[slipIdx] || config.payslips[0];
  const paydayNote =
    config.payroll.payday.includes(",") ? config.payroll.payday.split(",")[1].trim() : config.payroll.paydayShort;

  const chips = useMemo(() => {
    if (stage === 2) {
      return (config.payslips[0]?.rows || [])
        .filter((r) => /PPh|BPJS|Lembur|Overtime/i.test(r[0]))
        .map((r) => ({
          lbl: /PPh|Pajak/i.test(r[0]) ? "PPh 21" : /BPJS/i.test(r[0]) ? "BPJS" : "Lembur",
          v: r[1],
        }));
    }
    return [];
  }, [stage, config.payslips]);

  return (
    <>
      <div className="bg-orbs">
        <span className="o1" />
        <span className="o2" />
        <span className="o3" />
      </div>
      <div className="grain" />

      {!loggedIn && (
        <div id="loginView" role="dialog" aria-label="Sign in">
          <div className="lg-card">
            <div className="lg-brand">
              <span className="mark">
                <img src="/brand/proqpay-icon.png" alt="ProQPay" />
              </span>
              <div>
                <div className="nm">ProQPay</div>
                <div className="sub">Payroll & HR Digital</div>
              </div>
            </div>
            <h1>Welcome back</h1>
            <div className="lead">Masuk dengan Employee ID dan password portal Anda. Password pertama = kode project + tanggal gabung (YYYYMMDD).</div>
            <div className="lg-field">
              <div className="k">Employee ID</div>
              <input
                className="lg-input"
                value={empInput}
                onChange={(e) => setEmpInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("lgPass")?.focus()}
                autoComplete="username"
                placeholder="NRK atau kode karyawan"
                spellCheck={false}
              />
            </div>
            <div className="lg-field">
              <div className="k">Password</div>
              <div className="lg-input-wrap">
                <input
                  id="lgPass"
                  className="lg-input"
                  type={showPass ? "text" : "password"}
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button type="button" className="lg-eye" onClick={() => setShowPass((s) => !s)} aria-label="Show password">
                  <Icon name={showPass ? "eyeOff" : "eye"} size={16} />
                </button>
              </div>
            </div>
            <div className="lg-row">
              <label className="lg-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ingat saya
                di perangkat ini
              </label>
              <button type="button" className="lg-forgot" onClick={() => showToast("Hubungi HR perusahaan Anda untuk mereset kata sandi.")}>
                Forgot password?
              </button>
            </div>
            {loginErr ? <div className="lg-err show">{loginErr}</div> : null}
            <button type="button" className={"lg-btn" + (loginBusy ? " loading" : "")} disabled={loginBusy} onClick={doLogin}>
              <span className="spinner" />
              <span>Sign In</span>
            </button>
            <div className="lg-foot">© 2026 ProQPay</div>
          </div>
        </div>
      )}

      {loggedIn && mustChange ? (
        <div id="changePassView" role="dialog" aria-label="Ganti password">
          <div className="lg-card">
            <div className="lg-brand">
              <span className="mark">
                <img src="/brand/proqpay-icon.png" alt="ProQPay" />
              </span>
              <div>
                <div className="nm">ProQPay</div>
                <div className="sub">Keamanan akun</div>
              </div>
            </div>
            <h1>Ganti password</h1>
            <div className="lead">Password sementara wajib diganti sebelum melihat slip gaji. Minimal 12 karakter, huruf besar, huruf kecil, angka, dan simbol.</div>
            <div className="lg-field">
              <div className="k">Password saat ini</div>
              <input className="lg-input" type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="lg-field">
              <div className="k">Password baru</div>
              <input className="lg-input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="lg-field">
              <div className="k">Konfirmasi password baru</div>
              <input className="lg-input" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doChangePassword()} autoComplete="new-password" />
            </div>
            {changeErr ? <div className="lg-err show">{changeErr}</div> : null}
            <button type="button" className={"lg-btn" + (changeBusy ? " loading" : "")} disabled={changeBusy} onClick={() => void doChangePassword()}>
              <span className="spinner" />
              <span>Simpan password baru</span>
            </button>
            <button type="button" className="lg-forgot" style={{ marginTop: 14 }} onClick={logout}>Keluar</button>
          </div>
        </div>
      ) : null}

      {loggedIn ? (
      <div className={loaded ? "loaded-root" : ""} data-loaded={loaded}>
        <style>{`body.portal-loaded .reveal, .loaded-root .reveal { opacity: 1; transform: none; }
        .loaded-root .tabbar { opacity: 1; transform: translateX(-50%) translateY(0); }`}</style>

        <header className="app-header">
          <div className="h-inner">
            <div className="brand">
              <span className="mark">
                <img src="/brand/proqpay-icon.png" alt="ProQPay" />
              </span>
              <span className="nm">ProQPay</span>
            </div>
            <button className="icon-btn" title="Notifikasi" aria-label="Notifikasi" onClick={() => setModal("notify")}>
              <Icon name="bell" />
              {config.notifications.some((n) => n.unread) ? <span className="dot" /> : null}
            </button>
            <div className="user-chip" onClick={() => setModal("profile")}>
              <div className="avatar">
                <span>{initials(config.employee.name)}</span>
              </div>
              <div className="user-meta">
                <div className="name">{config.employee.name}</div>
                <div className="co">{config.employee.company}</div>
              </div>
            </div>
          </div>
        </header>

        {!adHidden && config.ads[0] ? (
          <section className="ad-wrap reveal" style={{ ["--d" as string]: ".04s" }} aria-label="Promosi">
            <button className="ad-close" onClick={() => setAdHidden(true)} aria-label="Tutup iklan">
              ✕
            </button>
            <div className="ad-track">
              <div className="ad-slide" style={{ background: config.ads[0].bg }}>
                <AdArt />
                <div className="txt">
                  <span className="tag">{config.ads[0].tag}</span>
                  <h3>{config.ads[0].title}</h3>
                  <p>{config.ads[0].desc}</p>
                  <button className="cta" onClick={() => setModal("ewa")}>
                    {config.ads[0].cta}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main className="app">
          <section className="hero reveal" style={{ ["--d" as string]: ".04s" }}>
            <div className="hero-head">
              <div>
                <h1>
                  Hello, <em>{firstName}</em> 👋
                </h1>
                <p>Your pay hub — all your payroll info in one place</p>
              </div>
              <span className="live-pill">
                <i /> {enPeriod(config.payroll.period).split(" ")[0]} · Live
              </span>
            </div>
            <div className="stats">
              <div className="stat reveal">
                <div className="ic iv">
                  <Icon name="wallet" size={15} />
                </div>
                <div className="lbl">Net salary {processing ? "(est.)" : ""}</div>
                <div className="val">{fmt(totalOf(config.payslips[0]?.rows || []))}</div>
              </div>
              <div className="stat reveal">
                <div className="ic ig">
                  <Icon name="calendar" size={15} />
                </div>
                <div className="lbl">Payday</div>
                <div className="val">{config.payroll.paydayShort}</div>
              </div>
              <div className="stat reveal">
                <div className="ic ia">
                  <Icon name="hash" size={15} />
                </div>
                <div className="lbl">Payroll ref.</div>
                <div className="val">{config.payroll.ref.slice(-6)}</div>
              </div>
            </div>
          </section>

          <section className="card reveal" aria-label="Payroll status for the current month">
            <div className="card-head">
              <div>
                <h2>Payroll Status — {enPeriod(config.payroll.period)}</h2>
                <div className="sub">Your payroll progress at a glance</div>
              </div>
              <span className={"pill " + (stage >= 4 ? "ok" : "info pulse")}>
                <i />
                {config.stages[stage - 1]?.title || "Processing"}
              </span>
            </div>
            <div className="stage-hero">
              <div className="ring-wrap">
                <svg viewBox="0 0 74 74">
                  <defs>
                    <linearGradient id="ringGrad" x1="0.5" y1="0" x2="1" y2="0.75">
                      <stop offset="0%" stopColor="#24355f" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  <circle className="ring-bg" cx="37" cy="37" r="26" />
                  <circle
                    className="ring-fg"
                    cx="37"
                    cy="37"
                    r="26"
                    style={{ strokeDashoffset: RING_C * (1 - stage / 4) }}
                  />
                </svg>
                <span className="pct">{Math.round((stage / 4) * 100)}%</span>
              </div>
              <div className="sh">
                <div className="t">{config.stages[stage - 1]?.title}</div>
                <div className="d">{config.stages[stage - 1]?.desc}</div>
                <span className="eta">
                  <Icon name="clock" size={13} /> <span>{config.stages[stage - 1]?.eta}</span>
                </span>
              </div>
            </div>
            <div className="stepper">
              {config.stages.map((s, i) => {
                const cls = i < stage - 1 ? " is-complete" : i === stage - 1 ? " is-current" : "";
                const tag = i < stage - 1 ? { t: "Done", c: "done" } : i === stage - 1 ? { t: "In progress", c: "now" } : { t: "Queued", c: "wait" };
                const icon = i < stage - 1 ? "check" : (["file", "gear", "clock", "check"][i] as string);
                return (
                  <div className={"step" + cls} key={s.title}>
                    <div className="rail">
                      <span className="badge">
                        <Icon name={icon} size={19} />
                      </span>
                    </div>
                    <div className="body">
                      <div className="t">
                        {s.title} <span className={"step-tag " + tag.c}>{tag.t}</span>
                      </div>
                      <div className="d">{s.desc}</div>
                      <div className="meta">
                        <Icon name="clock" size={11} /> {s.meta}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="stage-note">{config.stages[stage - 1]?.note}</div>
            <div className="chips">
              {stage === 2 &&
                chips.map((it) => (
                  <span className={"chip-tag " + (it.v > 0 ? "pos" : "neg")} key={it.lbl + it.v}>
                    {(it.v > 0 ? "+" : "-") + " " + fmt(Math.abs(it.v)) + " · " + it.lbl}
                  </span>
                ))}
              {stage === 4 && (
                <span className="chip-tag pos">
                  <Icon name="check" size={13} /> Salary paid to your account
                </span>
              )}
              {stage === 3 && (
                <span className="chip-tag neg">
                  <Icon name="clock" size={13} /> Awaiting payout
                </span>
              )}
              {stage === 1 && (
                <span className="chip-tag neg">
                  <Icon name="clock" size={13} /> Awaiting payroll data from your company
                </span>
              )}
            </div>

          </section>

          <section className="quick reveal" aria-label="Aksi cepat">
            <button className="qbtn" onClick={() => openSlip(0)}>
              <span className="ic dl">
                <Icon name="download" size={20} />
              </span>
              <span>
                <span className="lbl">Download Payslip</span>
                <span className="sub">{enPeriod(config.payroll.period)} slip</span>
              </span>
              <span className="chev">
                <Icon name="chevR" size={15} />
              </span>
            </button>
          </section>

          <section className="card reveal" aria-label="Advance Salary EWA">
            <div className="ewaa">
              <div className="ewaa-head">
                <span className="ewaa-ic">
                  <Icon name="wallet" size={20} />
                </span>
                <div className="ewaa-tt">
                  <b>Advance Salary</b>
                  <span>Cairkan gaji yang sudah Anda kerjakan, tanpa menunggu gajian</span>
                </div>
                <span className={"pill " + (eligible ? "ok" : "warn")}>{eligible ? "Ready" : "Locked"}</span>
              </div>
              <div className="ewaa-avail">
                <div>
                  <div className="l">Advance Limit</div>
                  <div className="v">{fmt(plafond)}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 10.5, color: "var(--muted)", lineHeight: 1.5 }}>
                  Up to 30%
                  <br />
                  of this month&apos;s pay
                </div>
              </div>
              {ewaApp ? (
                <div className="app-card">
                  <div className="h">
                    <b>{ewaApp.ref}</b>
                    <span className="pill warn">{ewaApp.status}</span>
                  </div>
                  <div className="amt">
                    {fmt(ewaApp.amount)} <small>incl. fee {fmt(ewaApp.fee)}</small>
                  </div>
                </div>
              ) : null}
              <div className="ewaa-sub">
                Cairkan gaji yang sudah Anda kerjakan tanpa agunan. Biaya layanan transparan dan dipotong otomatis saat
                gajian.
              </div>
              <button className="btn primary" style={{ width: "100%" }} onClick={() => setModal("ewa")} disabled={!eligible}>
                Request Advance
              </button>
            </div>
          </section>

          <section className="card reveal">
            <div className="card-head">
              <div>
                <h2>Payslip History</h2>
                <div className="sub">Tap a period to view the details</div>
              </div>
              <span className="pill info">{config.payslips.length} months</span>
            </div>
            {config.payslips.length === 0 ? (
              <p className="ewaa-sub" style={{ marginTop: 12 }}>
                Belum ada slip gaji untuk akun ini.
              </p>
            ) : null}
            {config.payslips.map((p, i) => (
              <div className="hist-item" key={p.period} onClick={() => openSlip(i)}>
                <div>
                  <div className="m">{enPeriod(p.period)}</div>
                  <div className="st">{p.status === "paid" ? "Paid" : "Processing"}</div>
                </div>
                <div className="amt">{fmt(totalOf(p.rows))}</div>
                <span className="chev">
                  <Icon name="chevR" size={15} />
                </span>
              </div>
            ))}
          </section>
        </main>

        <footer className="app-footer reveal">
          <img className="foot-logo" src="/brand/proqpay-logo.png" alt="ProQPay" />
          <br />
          © 2026 ProQPay
          <br />
          <a
            href="#help"
            onClick={(e) => {
              e.preventDefault();
              setModal("help");
            }}
          >
            Help
          </a>
          &nbsp;·&nbsp;
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              showToast("Seluruh data Anda diproses sesuai ketentuan perlindungan data.");
            }}
          >
            Privacy
          </a>
        </footer>

        <nav className="tabbar" aria-label="Navigasi utama">
          {(
            [
              ["home", "home", "Home"],
              ["slip", "file", "Slip"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={"tab-btn" + (tab === id ? " active" : "")}
              onClick={() => {
                setTab(id);
                if (id === "slip") openSlip(0);
              }}
            >
              <Icon name={icon} />
              <span className="lb">{label}</span>
            </button>
          ))}
          <button
            className="tab-fab"
            onClick={() => {
              setTab("ewa");
              setModal("ewa");
            }}
          >
            <Icon name="wallet" />
            <span>Advance</span>
          </button>
          {(
            [
              ["help", "help", "Help"],
              ["profile", "user", "Profile"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={"tab-btn" + (tab === id ? " active" : "")}
              onClick={() => {
                setTab(id);
                setModal(id === "help" ? "help" : "profile");
              }}
            >
              <Icon name={icon} />
              <span className="lb">{label}</span>
            </button>
          ))}
        </nav>
      </div>
      ) : null}

      {toast ? (
        <div className="toast show">
          <Icon name="check" size={17} />
          <span>{toast}</span>
        </div>
      ) : null}

      {loggedIn && !loaded ? (
        <div id="skeleton">
          <div className="sk-inner">
            <div className="sk-h" />
            <div className="sk-line" style={{ width: "40%" }} />
            <div className="sk-card" />
            <div className="sk-card" style={{ height: 150 }} />
          </div>
        </div>
      ) : null}

      {modal === "payslip" && slip ? (
        <Sheet title={"Payslip — " + enPeriod(slip.period)} onClose={() => setModal(null)}>
          <div className="slip-meta">
            <div>
              <b>{config.company.name}</b>
              <br />
              <span>{config.employee.name}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <b>{slip.status === "paid" ? "Paid" : "Estimate"}</b>
              <br />
              <span>{config.employee.bank}</span>
            </div>
          </div>
          <div className="slip-grid">
            {slip.rows.filter((r) => r[1] > 0).length ? <div className="slip-sec">Penghasilan</div> : null}
            {slip.rows.filter((r) => r[1] > 0).map((r) => (
              <FragmentRow key={r[0]} label={r[0]} amount={r[1]} />
            ))}
            {slip.rows.filter((r) => r[1] < 0).length ? <div className="slip-sec">Potongan</div> : null}
            {slip.rows.filter((r) => r[1] < 0).map((r) => (
              <FragmentRow key={r[0]} label={r[0]} amount={r[1]} />
            ))}
            <div className="slip-total">
              <span>Gaji bersih</span>
              <span>{fmt(totalOf(slip.rows))}</span>
            </div>
          </div>
          <div className="modal-foot" style={{ margin: "16px -20px -20px", borderTop: "1px solid var(--border)" }}>
            <button className="btn ghost" onClick={() => window.print()}>
              <Icon name="print" size={17} /> Print / PDF
            </button>
            <button
              className="btn primary"
              onClick={() => {
                window.print();
                showToast("Gunakan Print → Save as PDF untuk unduh slip.");
              }}
            >
              <Icon name="download" size={17} /> Download
            </button>
          </div>
        </Sheet>
      ) : null}

      {modal === "profile" ? (
        <Sheet title="My Profile" onClose={() => setModal(null)}>
          <div className="prof-hero">
            <div className="avatar">
              <span>{initials(config.employee.name)}</span>
            </div>
            <div>
              <div className="t">{config.employee.name}</div>
              <div className="s">
                {config.employee.role} · {config.employee.company}
              </div>
            </div>
          </div>
          <div className="prof-rows">
            {[
              ["mail", "Work email", config.employee.email],
              ["phone", "Phone", config.employee.phone],
              ["hash", "Employee ID", config.employee.empId],
              ["wallet", "Salary account", config.employee.bank],
            ].map((r) => (
              <div className="prof-row" key={r[1]}>
                <span className="ic">
                  <Icon name={r[0]} size={16} />
                </span>
                <div>
                  <div className="k">{r[1]}</div>
                  <div className="v">{r[2]}</div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="logout-btn" onClick={logout}>
            <Icon name="logout" size={16} /> Log Out
          </button>
        </Sheet>
      ) : null}

      {modal === "help" ? (
        <Sheet title="Help Center" onClose={() => setModal(null)}>
          <div className="help-item" onClick={() => showToast("Hubungi HR: " + (config.company.contact || "helpdesk"))}>
            <span className="ic ib">
              <Icon name="build" size={18} />
            </span>
            <div>
              <div className="t">Contact HR</div>
              <div className="s">{config.company.contact || "Hubungi HR perusahaan Anda"}</div>
            </div>
            <span className="chev">
              <Icon name="chevR" size={15} />
            </span>
          </div>
          <div className="help-item" onClick={() => setFaqOpen((v) => !v)}>
            <span className="ic ib">
              <Icon name="help" size={18} />
            </span>
            <div>
              <div className="t">Payroll FAQ</div>
              <div className="s">Tax, BPJS, payday schedule</div>
            </div>
            <span className="chev">
              <Icon name="chevR" size={15} />
            </span>
          </div>
          {faqOpen ? (
            <div style={{ marginTop: 4 }}>
              <details className="faq-item" open>
                <summary>When is my salary paid out?</summary>
                <div className="faq-body">
                  Gaji periode berjalan dicairkan setelah proses payroll selesai — diperkirakan sebelum tanggal gajian.
                  Pantau statusnya di kartu Payroll Status.
                </div>
              </details>
              <details className="faq-item">
                <summary>What is PPh 21?</summary>
                <div className="faq-body">
                  PPh 21 adalah pajak penghasilan yang dipotong dari gaji sesuai ketentuan yang berlaku. Rincian lengkapnya
                  selalu tercantum di slip gaji Anda.
                </div>
              </details>
              <details className="faq-item">
                <summary>How much is my BPJS deduction?</summary>
                <div className="faq-body">
                  BPJS Kesehatan 1% dari gaji Anda dan BPJS Ketenagakerjaan 2%. Nilai pastinya tertera di rincian slip
                  gaji.
                </div>
              </details>
              <details className="faq-item">
                <summary>How do I change my salary account?</summary>
                <div className="faq-body">
                  Hubungi HR perusahaan minimal 5 hari kerja sebelum tanggal cut-off agar berlaku pada periode berikutnya.
                </div>
              </details>
            </div>
          ) : null}
        </Sheet>
      ) : null}

      {modal === "notify" ? (
        <Sheet title="Notifications" onClose={() => setModal(null)}>
          {config.notifications.length === 0 ? (
            <p className="ewaa-sub">Tidak ada notifikasi.</p>
          ) : null}
          {config.notifications.map((n) => (
            <div className="notif-item" key={n.title}>
              <span className={"ic " + (n.type === "g" ? "ig" : "ia")}>
                <Icon name={n.type === "g" ? "wallet" : "clock"} size={17} />
              </span>
              <div>
                <div className="t">{n.title}</div>
                <div className="s">{n.s}</div>
              </div>
              {n.unread ? <span className="dot" /> : null}
            </div>
          ))}
        </Sheet>
      ) : null}

      {modal === "ewa" ? (
        <Sheet title="Advance Salary" onClose={() => setModal(null)}>
          <div className="wsteps">
            {[1, 2, 3].map((n) => (
              <div key={n} className={"wstep" + (wiz.step > n ? " done" : wiz.step === n ? " now" : "")} data-n={n}>
                {n === 1 ? "Amount" : n === 2 ? "Method" : "Confirm"}
              </div>
            ))}
          </div>
          {wiz.step === 1 && (
            <div className="wiz-body">
              <div className="amt-big">{fmt(wiz.amount)}</div>
              <input
                className="amt-range"
                type="range"
                min={100000}
                max={Math.max(100000, plafond)}
                step={10000}
                value={Math.min(wiz.amount, Math.max(100000, plafond))}
                onChange={(e) => setWiz({ ...wiz, amount: Number(e.target.value) })}
              />
              <div className="range-hints">
                <span>{fmt(100000)}</span>
                <span>{fmt(plafond)}</span>
              </div>
              <div className="plafond-line">
                <Icon name="wallet" size={12} /> Limit: <b>{fmt(plafond)}</b>
              </div>
              <div className="fee-row">
                <span>Service fee</span>
                <b>{fmt(ewaFee(wiz.amount, ewa.rules))}</b>
              </div>
              <div className="fee-row">
                <span>You receive</span>
                <b>{fmt(wiz.amount)}</b>
              </div>
              <button className="btn primary" style={{ width: "100%", marginTop: 16 }} onClick={() => setWiz({ ...wiz, step: 2 })}>
                Continue
              </button>
            </div>
          )}
          {wiz.step === 2 && (
            <div className="wiz-body">
              <div
                className={"pay-opt" + (wiz.method === "auto" ? " sel" : "")}
                onClick={() => setWiz({ ...wiz, method: "auto" })}
              >
                <span className="ic">
                  <Icon name="bank" size={18} />
                </span>
                <div className="tx">
                  <b>Salary account</b>
                  <small>{config.employee.bank}</small>
                </div>
              </div>
              <button className="btn ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => setWiz({ ...wiz, step: 1 })}>
                Back
              </button>
              <button className="btn primary" style={{ width: "100%", marginTop: 8 }} onClick={() => setWiz({ ...wiz, step: 3 })}>
                Continue
              </button>
            </div>
          )}
          {wiz.step === 3 && (
            <div className="wiz-body">
              <div className="sum-row">
                <span>Amount</span>
                <b>{fmt(wiz.amount)}</b>
              </div>
              <div className="sum-row">
                <span>Fee</span>
                <b>{fmt(ewaFee(wiz.amount, ewa.rules))}</b>
              </div>
              <div className="sum-row">
                <span>Payday deduction</span>
                <b>{paydayNote}</b>
              </div>
              <label className="agree">
                <input type="checkbox" checked={wiz.agreed} onChange={(e) => setWiz({ ...wiz, agreed: e.target.checked })} />
                Saya setuju biaya layanan dipotong otomatis pada gaji periode berjalan.
              </label>
              <button className="btn ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => setWiz({ ...wiz, step: 2 })}>
                Back
              </button>
              <button
                className="btn primary"
                style={{ width: "100%", marginTop: 8 }}
                disabled={!wiz.agreed}
                onClick={() => {
                  setModal(null);
                  setWiz({ step: 1, amount: 1000000, method: "auto", inst: 1, agreed: false });
                  showToast("Pengajuan advance akan diproses oleh HR. Hubungi HR bila butuh bantuan.");
                }}
              >
                Submit request
              </button>
            </div>
          )}
        </Sheet>
      ) : null}

      <PrintSlip config={config} slip={slip} idx={slipIdx} />
    </>
  );
}

function AdArt() {
  return (
    <svg className="ad-art" viewBox="0 0 260 260" fill="none" aria-hidden>
      <defs>
        <linearGradient id="artGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#f26522" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="128" r="96" fill="rgba(242,101,34,.22)" />
      <circle cx="130" cy="128" r="56" fill="rgba(242,101,34,.13)" />
      <g transform="rotate(6 130 130)">
        <rect x="66" y="26" width="128" height="208" rx="20" fill="#0b1226" stroke="#4a5b92" strokeWidth="2.5" />
        <rect x="72" y="33" width="116" height="194" rx="14" fill="#1b2a52" />
        <rect x="86" y="50" width="60" height="11" rx="5.5" fill="#3d4f85" />
        <circle cx="130" cy="112" r="26" fill="url(#artGrad)" />
        <path d="M119 112l7 8 15-16" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="88" y="158" width="84" height="15" rx="7.5" fill="#2a3a6b" />
        <rect x="88" y="183" width="64" height="15" rx="7.5" fill="#24355f" />
      </g>
      <circle cx="212" cy="48" r="13" fill="#ff8a3d" />
      <circle cx="212" cy="48" r="13" stroke="#ffb27e" strokeWidth="2" />
      <path d="M206 48h12M208.5 45.5v5M215.5 45.5v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 96l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#ff8a3d" />
      <path d="M222 128l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#ff8a3d" opacity=".8" />
      <circle cx="70" cy="196" r="3.5" fill="#fff" opacity=".35" />
      <circle cx="236" cy="208" r="4" fill="#fff" opacity=".4" />
    </svg>
  );
}

function FragmentRow({ label, amount }: { label: string; amount: number }) {
  return (
    <>
      <span>{label}</span>
      <span className={"g" + (amount < 0 ? " minus" : "")}>{fmt(amount)}</span>
    </>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function PrintSlip({ config, slip, idx }: { config: PortalConfig; slip?: Payslip; idx: number }) {
  if (!slip) return null;
  const earn = slip.rows.filter((r) => r[1] > 0);
  const ded = slip.rows.filter((r) => r[1] < 0);
  const thp = totalOf(slip.rows);
  const paid = slip.status === "paid";
  return (
    <div className="print-slip" id="printSlip" aria-hidden>
      <div className="ps-wrap">
        <div className="ps-kop">
          <img className="ps-logo" src="/brand/proqpay-icon.png" alt="" />
          <div>
            <div className="ps-co-name">{config.company.name.toUpperCase()}</div>
            <div className="ps-co-sub">{config.company.tagline}</div>
            <div className="ps-co-addr">
              {config.company.address}
              <br />
              {config.company.contact}
            </div>
          </div>
          <div className={"ps-stamp " + (paid ? "paid" : "est")}>{paid ? "PAID" : "ESTIMASI"}</div>
        </div>
        <div className="ps-rule">
          <span className="r1" />
          <span className="r2" />
        </div>
        <div className="ps-title">
          <div className="ps-title-main">
            PAYSLIP <small>— {enPeriod(slip.period)}</small>
          </div>
          <div className="ps-ref">
            Ref: <b>{slipRef(idx, slip.period)}</b> · Status: <b>{paid ? "Paid" : "Estimate"}</b>
          </div>
        </div>
        <table className="ps-tbl ps-ident">
          <tbody>
            <tr>
              <th>Nama</th>
              <td>{config.employee.name}</td>
              <th>Jabatan</th>
              <td>{config.employee.role}</td>
            </tr>
            <tr>
              <th>ID</th>
              <td>{config.employee.empId}</td>
              <th>Bank</th>
              <td>{config.employee.bank}</td>
            </tr>
          </tbody>
        </table>
        <div className="ps-detail">
          <div className="ps-col">
            <div className="ps-col-h">PENGHASILAN</div>
            <table className="ps-tbl">
              <tbody>
                {earn.map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td className="a">{fmt(r[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ps-col-tot">
              <span>Subtotal</span>
              <b>{fmt(earn.reduce((s, r) => s + r[1], 0))}</b>
            </div>
          </div>
          <div className="ps-col">
            <div className="ps-col-h">POTONGAN</div>
            <table className="ps-tbl">
              <tbody>
                {ded.map((r) => (
                  <tr className="ded" key={r[0]}>
                    <td>{r[0]}</td>
                    <td className="a">{fmt(r[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ps-col-tot">
              <span>Subtotal</span>
              <b>{fmt(ded.reduce((s, r) => s + r[1], 0))}</b>
            </div>
          </div>
        </div>
        <div className="ps-thp">
          <div>
            <div className="l">GAJI BERSIH (THP)</div>
            <div className="s">{paid ? "Final" : "Estimasi — dana diteruskan ke rekening terdaftar"}</div>
          </div>
          <div className="v">{fmt(thp)}</div>
        </div>
        <div className="ps-foot">
          Dicetak otomatis oleh ProQPay ESS · {config.company.legal} · Halaman 1 / 1
        </div>
      </div>
    </div>
  );
}
