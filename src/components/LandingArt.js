// Decorative artwork for the landing page. Pure SVG, so it stays sharp and needs no image files.

const Sparkle = ({ x, y, s = 1, o = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill="#8fd6cc"
    d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14Z" />
);

const Cap = ({ x, y, rot = 0, w = 120, h = 44 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} filter="url(#lpShadow)">
    <clipPath id="lpCapClip"><rect width={w} height={h} rx={h / 2} /></clipPath>
    <g clipPath="url(#lpCapClip)">
      <rect width={w / 2} height={h} fill="url(#lpPink)" />
      <rect x={w / 2} width={w / 2} height={h} fill="#fdfefe" />
      <rect x={w / 2} y={h * 0.55} width={w / 2} height={h * 0.45} fill="#e4eaed" />
      <rect x="10" y="7" width={w - 40} height="7" rx="3.5" fill="#fff" opacity=".55" />
    </g>
  </g>
);

export function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lpLogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#25b3a3" /><stop offset="1" stopColor="#0f7f77" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#lpLogo)" />
      <g transform="rotate(-42 22 22)">
        <rect x="9" y="13" width="26" height="14" rx="7" fill="#fff" />
        <path d="M22 13h6a7 7 0 0 1 0 14h-6z" fill="#bfe9e3" />
      </g>
      <circle cx="31" cy="32" r="8" fill="#fff" />
      <path d="M31 27.5V32l3 2" fill="none" stroke="#0f7f77" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg className="lp-art" viewBox="0 0 600 620" role="img" aria-label="A phone showing a medicine reminder, with a pill bottle, tablets and capsules">
      <defs>
        <linearGradient id="lpTeal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#47b5ae" /><stop offset="1" stopColor="#1f8089" /></linearGradient>
        <linearGradient id="lpBottle" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3fa6a4" /><stop offset=".55" stopColor="#5fbdb6" /><stop offset="1" stopColor="#2a8a90" /></linearGradient>
        <linearGradient id="lpPhone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38979f" /><stop offset="1" stopColor="#1b6674" /></linearGradient>
        <linearGradient id="lpBtn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2fbfab" /><stop offset="1" stopColor="#12887e" /></linearGradient>
        <linearGradient id="lpGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#58c9a1" /><stop offset="1" stopColor="#2a9677" /></linearGradient>
        <linearGradient id="lpPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffa9bb" /><stop offset="1" stopColor="#f06f8d" /></linearGradient>
        <filter id="lpShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#0b4a52" floodOpacity=".22" /></filter>
        <filter id="lpSoft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0b4a52" floodOpacity=".12" /></filter>
      </defs>

      {/* backdrop */}
      <path className="lp-blob" d="M110 340C80 180 230 50 385 58c140 8 205 130 180 270-20 120-130 232-262 232-112 0-178-110-193-220z" />
      <path d="M520 480C495 405 515 340 575 295c10 62-12 135-55 185z" fill="#cdebe6" opacity=".9" />
      <path d="M545 520C535 470 548 430 585 405c4 40-10 84-40 115z" fill="#b9e2db" opacity=".9" />
      <ellipse className="lp-ground" cx="330" cy="560" rx="250" ry="24" />

      <Sparkle x={560} y={70} s={1.1} />
      <Sparkle x={215} y={250} s={.9} />
      <Sparkle x={105} y={380} s={.7} o={.8} />
      <Sparkle x={42} y={560} s={.6} o={.7} />
      <g transform="translate(160 130) scale(2.1)" fill="none" stroke="#7fd0c6" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
      </g>

      {/* pill bottle */}
      <g transform="translate(34 6)" filter="url(#lpShadow)">
        <rect x="62" y="252" width="150" height="248" rx="32" fill="url(#lpBottle)" />
        <rect x="62" y="332" width="150" height="124" fill="#fbfefd" />
        <rect x="108" y="382" width="58" height="22" rx="6" fill="url(#lpGreen)" />
        <rect x="126" y="364" width="22" height="58" rx="6" fill="url(#lpGreen)" />
        <rect x="76" y="242" width="122" height="16" rx="5" fill="#2a8a90" />
        <rect x="68" y="174" width="138" height="74" rx="14" fill="url(#lpTeal)" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={80 + i * 14} y="184" width="5" height="54" rx="2.5" fill="#fff" opacity=".22" />
        ))}
      </g>

      {/* phone */}
      <g transform="rotate(7 385 265)">
        <rect x="268" y="70" width="222" height="392" rx="42" fill="url(#lpPhone)" filter="url(#lpShadow)" />
        <rect className="lp-screen" x="281" y="83" width="196" height="366" rx="31" />

        <g filter="url(#lpSoft)">
          <rect className="lp-card" x="293" y="108" width="172" height="172" rx="18" />
        </g>
        <path d="M379 122a3 3 0 1 1 0 .1zM365 150v-9a14 14 0 0 1 28 0v9l6 9h-40zM373 163a6 6 0 0 0 12 0z" fill="#1f8a86" />
        <text className="lp-t1" x="379" y="196" textAnchor="middle" fontSize="27" fontWeight="800">08:00<tspan fontSize="13" dx="3">AM</tspan></text>
        <text className="lp-t2" x="379" y="214" textAnchor="middle" fontSize="11.5">Time to take your</text>
        <text className="lp-t2" x="379" y="229" textAnchor="middle" fontSize="11.5">medicine</text>
        <rect x="313" y="241" width="132" height="29" rx="10" fill="url(#lpBtn)" />
        <text x="379" y="260" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">Take Now</text>

        {[["Vitamin D", "1 Tablet", 294], ["Antibiotic", "1 Capsule", 342], ["Pain Relief", "1 Tablet", 390]].map(([n, d, y]) => (
          <g key={n} filter="url(#lpSoft)">
            <rect className="lp-card" x="293" y={y} width="172" height="40" rx="12" />
            <circle cx="314" cy={y + 20} r="12" fill="#d3eeea" />
            <rect x="307" y={y + 16} width="14" height="8" rx="4" fill="#2a98a0" transform={`rotate(-40 314 ${y + 20})`} />
            <text className="lp-t1" x="334" y={y + 18} fontSize="12" fontWeight="700">{n}</text>
            <text className="lp-t2" x="334" y={y + 32} fontSize="10">{d}</text>
          </g>
        ))}

        <circle cx="490" cy="330" r="29" fill="url(#lpGreen)" stroke="#fff" strokeWidth="4" filter="url(#lpShadow)" />
        <path d="M477 330l9 9 17-19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* blister pack */}
      <g transform="translate(40 452) rotate(-22)" filter="url(#lpShadow)">
        <rect width="136" height="112" rx="14" fill="#e6ebee" stroke="#fff" strokeWidth="2" />
        {[[36, 34], [100, 34], [36, 82], [100, 82]].map(([cx, cy]) => (
          <g key={`${cx}${cy}`}>
            <ellipse cx={cx} cy={cy + 3} rx="23" ry="19" fill="#cdd5da" />
            <ellipse cx={cx} cy={cy} rx="21" ry="17" fill="#fff" />
            <path d={`M${cx - 10} ${cy - 2}h20`} stroke="#dfe5e8" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
      </g>

      <Cap x={284} y={498} rot={-26} />

      {/* loose tablet */}
      <g filter="url(#lpShadow)">
        <ellipse cx="452" cy="548" rx="40" ry="21" fill="#d6dde1" />
        <ellipse cx="452" cy="541" rx="40" ry="21" fill="#f8fafb" />
        <path d="M430 536l44 10" stroke="#d3dadf" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function CapsuleDeco() {
  return (
    <svg className="lp-deco" width="46" height="70" viewBox="0 0 46 70" aria-hidden="true">
      <g transform="rotate(-30 23 35)">
        <rect x="5" y="2" width="36" height="66" rx="18" fill="#bfe6e1" />
        <rect x="5" y="2" width="36" height="34" rx="17" fill="#6cc3bd" />
      </g>
    </svg>
  );
}
