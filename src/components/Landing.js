"use client";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import InstallButton from "./InstallButton";
import { CapsuleDeco, HeroArt, LogoMark } from "./LandingArt";
import { ArrowRight, BarChart, Bell, CalendarDays, Check, Clipboard, Menu, Pill, Users, X } from "./Icons";

// The navbar lists the app's real features; each link scrolls to its section below.
const FEATURES = [
  { id: "reminders", label: "Reminders" },
  { id: "medicines", label: "Medicines" },
  { id: "calendar", label: "Calendar" },
  { id: "caregivers", label: "Caregivers" },
  { id: "insights", label: "Insights" },
];

const TILES = [
  { href: "#reminders", Icon: Bell, title: "Smart Reminders", text: "Get notified on time, every time." },
  { href: "#medicines", Icon: Clipboard, title: "Track Your Meds", text: "Keep track of your medication easily." },
  { href: "#insights", Icon: BarChart, title: "Health Insights", text: "Understand your health better." },
];

function Wordmark() {
  return (
    <span className="lp-wordmark"><LogoMark size={40} /><span>Medi<b>Reminder</b></span></span>
  );
}

/* ---- Sample visuals for each feature section (static, illustrative) ---- */

function RemindersVisual() {
  return (
    <div className="lp-visual" aria-hidden="true">
      <div className="lp-toast"><span className="dose-icon"><Bell width={18} height={18} /></span>
        <span className="dose-info"><b>Time for your medicine</b><span>Vitamin D3 · 1 capsule</span></span></div>
      <p className="group-title due">Due now</p>
      <div className="dose is-due">
        <span className="dose-icon"><Bell width={18} height={18} /></span>
        <div className="dose-info"><b>Vitamin D3</b><span>8:00 AM · 1 capsule</span></div>
        <div className="dose-actions"><span className="btn ghost small">Skip</span><span className="btn small"><Check width={14} height={14} /> Taken</span></div>
      </div>
      <p className="group-title">Later today</p>
      <div className="dose">
        <span className="dose-icon"><Bell width={18} height={18} /></span>
        <div className="dose-info"><b>Metformin 500 mg</b><span>6:00 PM · with dinner</span></div>
        <div className="dose-actions"><span className="btn ghost small">Skip</span><span className="btn small"><Check width={14} height={14} /> Taken</span></div>
      </div>
    </div>
  );
}

function MedicinesVisual() {
  const med = (name, sub, days, dots) => (
    <div className="med-card" key={name}>
      <span className="dose-icon"><Pill width={18} height={18} /></span>
      <span className="med-main"><b>{name}</b><span className="muted">{sub}</span>
        <span className="daychips">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <i key={i} className={days.includes(i) ? "on" : ""}>{d}</i>)}</span>
      </span>
      <span className="med-side"><span className="dots">{dots.map((c, i) => <i key={i} className={c} />)}</span><small>Last 7 days</small></span>
    </div>
  );
  return (
    <div className="lp-visual lp-stack" aria-hidden="true">
      {med("Metformin 500 mg", "1 tablet · 8:00 AM, 6:00 PM", [0, 1, 2, 3, 4, 5, 6], ["ok", "ok", "ok", "miss", "ok", "ok", "ok"])}
      {med("Lisinopril 10 mg", "1 tablet · 8:00 PM", [1, 2, 3, 4, 5], ["none", "ok", "ok", "ok", "ok", "ok", "none"])}
      {med("Vitamin D3", "1 capsule · 8:00 AM · with food", [0, 2, 4, 6], ["ok", "none", "ok", "none", "ok", "none", "ok"])}
    </div>
  );
}

function CalendarVisual() {
  // A fixed sample month: 1 = all taken, 2 = some missed, 3 = missed, 0 = nothing scheduled / not yet.
  const tones = [1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 3, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
  const dots = { 1: ["taken", "taken"], 2: ["taken", "missed"], 3: ["missed", "missed"] };
  const cls = { 1: "full", 2: "partial", 3: "missed", 0: "none" };
  return (
    <div className="lp-visual" aria-hidden="true">
      <div className="cal-head"><h2>This month</h2><span className="badge taken"><Check width={12} height={12} strokeWidth={3} /> 91% taken</span></div>
      <div className="cal-grid cal-weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="cal-grid">
        {tones.map((t, i) => (
          <span key={i} className={`cal-day tone-${cls[t]}`}>
            <span className="cal-n">{i + 1}</span>
            {t > 0 && <span className="cal-dots">{dots[t].map((d, j) => <i key={j} className={d} />)}</span>}
          </span>
        ))}
      </div>
      <ul className="legend"><li><i className="dot taken" /> Taken</li><li><i className="dot skipped" /> Skipped</li><li><i className="dot missed" /> Missed</li></ul>
    </div>
  );
}

function CaregiversVisual() {
  return (
    <div className="lp-visual lp-stack" aria-hidden="true">
      <div className="card">
        <h3>Invite code</h3>
        <p className="muted">Give this to a guardian so they can follow your medicines.</p>
        <p className="code">K7M2PQ9X</p>
      </div>
      <div className="card">
        <h3>Your guardians</h3>
        <div className="person"><span className="avatar">A</span><div className="info"><div className="name">Ana Cruz</div><div className="muted">Guardian · follows your schedule</div></div><span className="chip">Linked</span></div>
      </div>
    </div>
  );
}

function InsightsVisual() {
  return (
    <div className="lp-visual lp-stack" aria-hidden="true">
      <div className="stats">
        <div className="stat"><span className="stat-num">86%</span><span className="stat-label">Adherence</span></div>
        <div className="stat good"><span className="stat-num">42</span><span className="stat-label">Taken</span></div>
        <div className="stat warn"><span className="stat-num">3</span><span className="stat-label">Skipped</span></div>
        <div className="stat bad"><span className="stat-num">4</span><span className="stat-label">Missed</span></div>
      </div>
      <div className="card">
        <div className="row-between"><b>Metformin 500 mg</b><span className="muted">Last 7 days</span></div>
        <div className="dots lp-dots-lg">{["ok", "ok", "ok", "miss", "ok", "ok", "ok"].map((c, i) => <i key={i} className={c} />)}</div>
      </div>
      <p className="muted lp-sample">Sample data</p>
    </div>
  );
}

const SECTIONS = [
  {
    id: "reminders", Icon: Bell, Visual: RemindersVisual,
    title: "Reminders that reach you on time",
    text: "Every dose lands on your Today list at the right time. Allow notifications and MediReminder nudges you the moment one is due.",
    points: ["Due now and later today, clearly separated", "Mark a dose Taken or Skip it, and Undo if you slip", "A notification with Taken and Skip buttons when a dose is due"],
  },
  {
    id: "medicines", Icon: Pill, Visual: MedicinesVisual,
    title: "Every medicine, on your schedule",
    text: "Add a medicine once with its dose, the times of day and the days of the week it applies. MediReminder does the remembering.",
    points: ["Several reminder times for one medicine", "Pick the days: every day, or only some", "Add a note such as \u201cwith food\u201d"],
  },
  {
    id: "calendar", Icon: CalendarDays, Visual: CalendarVisual,
    title: "See every day at a glance",
    text: "A month calendar shows each scheduled dose as a dot: taken, skipped, missed or still to come. Tap a day to see exactly what happened.",
    points: ["Colour-coded days, green to red", "Dose-by-dose detail for any day", "Monthly totals for taken, skipped and missed"],
  },
  {
    id: "caregivers", Icon: Users, Visual: CaregiversVisual,
    title: "Care together, even from far away",
    text: "Patients share an invite code and guardians link with it to follow along and help manage medicines. Guardians can also create accounts for people who can\u2019t set one up themselves.",
    points: ["Link with a code, remove a link any time", "Guardians see the patient\u2019s own day, even across time zones", "Admins manage users and reset passwords"],
  },
  {
    id: "insights", Icon: BarChart, Visual: InsightsVisual,
    title: "Understand how it\u2019s going",
    text: "See your adherence for the week and the month, plus a seven-day trail on every medicine, so a pattern of missed doses shows up early.",
    points: ["Adherence percentage at a glance", "Seven-day dots on every medicine", "Light and dark themes, built for phones too"],
  },
];

export default function Landing({ signupOpen, onGetStarted, onSignIn }) {
  const [open, setOpen] = useState(false);
  const start = () => onGetStarted(signupOpen ? "register" : "login");

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-in">
          <a href="#top" className="lp-brand" aria-label="MediReminder home"><Wordmark /></a>

          <nav className="lp-links" aria-label="Features">
            {FEATURES.map((f) => <a key={f.id} href={`#${f.id}`}>{f.label}</a>)}
          </nav>

          <div className="lp-nav-cta">
            <ThemeToggle variant="inline" />
            <InstallButton className="btn ghost lp-pill lp-install" />
            <button type="button" className="lp-signin" onClick={onSignIn}>Sign in</button>
            <button type="button" className="btn lp-pill" onClick={start}>Get Started</button>
            <button type="button" className="lp-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lp-menu">
            {FEATURES.map((f) => <a key={f.id} href={`#${f.id}`} onClick={() => setOpen(false)}>{f.label}</a>)}
            <InstallButton className="lp-menu-install" label="Install the app" />
            <button type="button" className="lp-signin" onClick={onSignIn}>Sign in</button>
          </div>
        )}
      </header>

      <main id="top">
        <section className="lp-hero">
          <div className="lp-hero-in">
            <div className="lp-copy">
              <CapsuleDeco />
              <h1>Never Miss<br /><span className="lp-accent">a Dose Again</span></h1>
              <p className="lp-lead">Your smart medicine reminder and health companion.</p>

              <div className="lp-tiles">
                {TILES.map(({ href, Icon, title, text }) => (
                  <a key={title} href={href} className="lp-tile">
                    <span className="lp-tile-icon"><Icon width={30} height={30} /></span>
                    <b>{title}</b>
                    <span>{text}</span>
                  </a>
                ))}
              </div>

              <button type="button" className="btn lp-cta" onClick={start}>Get Started <ArrowRight width={20} height={20} /></button>
              <p className="lp-tag">Your health. Our reminder. Better days ahead.</p>
            </div>

            <div className="lp-art-wrap"><HeroArt /></div>
          </div>
        </section>

        {SECTIONS.map(({ id, Icon, Visual, title, text, points }, i) => (
          <section key={id} id={id} className={`lp-section${i % 2 ? " alt" : ""}`}>
            <div className="lp-section-in">
              <div className="lp-section-copy">
                <span className="lp-badge"><Icon width={18} height={18} /> {FEATURES.find((f) => f.id === id).label}</span>
                <h2>{title}</h2>
                <p>{text}</p>
                <ul className="lp-points">{points.map((p) => <li key={p}><span><Check width={14} height={14} strokeWidth={3} /></span>{p}</li>)}</ul>
              </div>
              <Visual />
            </div>
          </section>
        ))}

        <section className="lp-final">
          <h2>Ready for better days ahead?</h2>
          <p>Set up your first medicine in under a minute.</p>
          <div className="lp-final-cta">
            <button type="button" className="btn lp-cta light" onClick={start}>Get Started <ArrowRight width={20} height={20} /></button>
            <InstallButton className="lp-final-link" label="Install the app" />
            <button type="button" className="lp-final-link" onClick={onSignIn}>I already have an account</button>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <Wordmark />
        <p>Your health. Our reminder. Better days ahead.</p>
        <nav aria-label="Footer">
          {FEATURES.map((f) => <a key={f.id} href={`#${f.id}`}>{f.label}</a>)}
          <button type="button" onClick={onSignIn}>Sign in</button>
        </nav>
      </footer>
    </div>
  );
}
