// Tiny SVG chart helpers for the mockups. The real app uses Recharts.
// Colors are CSS custom properties so each mockup can theme them.

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}
const tick = (n) => (n >= 1000 ? "$" + Math.round(n / 1000) + "K" : "$" + n);

function lineChart(el, { labels, values, color = "var(--seagreen)", ink = "var(--muted)", grid = "var(--grid)", w = 640, h = 240, area = true, money = true }) {
  const pad = { l: 48, r: 16, t: 16, b: 28 };
  const max = niceMax(Math.max(...values));
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (values.length - 1);
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  const id = "g" + Math.random().toString(36).slice(2, 8);
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.28"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>`;
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" style="stroke:${grid}"/>`;
    s += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="tk" style="fill:${ink}">${money ? tick(v) : v}</text>`;
  }
  labels.forEach((l, i) => (s += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="tk" style="fill:${ink}">${l}</text>`));
  const pts = values.map((v, i) => `${x(i)},${y(v)}`);
  // Smooth with a simple cardinal spline.
  let d = `M${pts[0]}`;
  for (let i = 0; i < values.length - 1; i++) {
    const p0 = [x(Math.max(i - 1, 0)), y(values[Math.max(i - 1, 0)])];
    const p1 = [x(i), y(values[i])];
    const p2 = [x(i + 1), y(values[i + 1])];
    const p3 = [x(Math.min(i + 2, values.length - 1)), y(values[Math.min(i + 2, values.length - 1)])];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1} ${c2} ${p2}`;
  }
  if (area) s += `<path d="${d} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z" style="fill:url(#${id})"/>`;
  s += `<path d="${d}" style="fill:none;stroke:${color};stroke-width:3;stroke-linecap:round"/>`;
  const li = values.length - 1;
  s += `<circle cx="${x(li)}" cy="${y(values[li])}" r="5" style="fill:${color};stroke:var(--panel);stroke-width:2.5"/>`;
  s += `</svg>`;
  el.innerHTML = s;
}

function barChart(el, { labels, values, color = "var(--cerulean)", ink = "var(--muted)", grid = "var(--grid)", w = 640, h = 240, highlightLast = true, lastColor }) {
  const pad = { l: 32, r: 12, t: 16, b: 28 };
  const max = niceMax(Math.max(...values));
  const bw = (w - pad.l - pad.r) / values.length;
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((max * i) / 4);
    s += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(v)}" style="stroke:${grid}"/>`;
    s += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="tk" style="fill:${ink}">${v}</text>`;
  }
  values.forEach((v, i) => {
    const bx = pad.l + i * bw + bw * 0.2;
    const fill = highlightLast && i === values.length - 1 ? lastColor || color : color;
    const op = highlightLast && i === values.length - 1 && !lastColor ? 0.45 : 1;
    s += `<rect x="${bx}" y="${y(v)}" width="${bw * 0.6}" height="${y(0) - y(v)}" rx="4" style="fill:${fill};opacity:${op}"/>`;
    s += `<text x="${bx + bw * 0.3}" y="${y(v) - 6}" text-anchor="middle" class="tk val" style="fill:${ink}">${v}</text>`;
    s += `<text x="${bx + bw * 0.3}" y="${h - 8}" text-anchor="middle" class="tk" style="fill:${ink}">${labels[i]}</text>`;
  });
  s += `</svg>`;
  el.innerHTML = s;
}

// Horizontal bars, one per stage, widths relative to the first (widest) stage.
function funnelBars(el, stages) {
  const max = stages[0].value;
  el.innerHTML = stages
    .map(
      (s) => `<div class="fb-row">
        <div class="fb-label">${s.key}<span>${s.count} deals</span></div>
        <div class="fb-track"><div class="fb-bar" style="width:${(100 * s.value) / max}%;background:${s.color}"></div></div>
        <div class="fb-val num">${money(s.value)}</div>
      </div>`
    )
    .join("");
}

// A centred tapered funnel drawn as stacked trapezoids.
function funnelTaper(el, stages, { w = 560, rowH = 52, gap = 6 } = {}) {
  const max = stages[0].value;
  const minW = 0.22;
  const widthAt = (v) => w * (minW + (1 - minW) * (v / max));
  const h = stages.length * (rowH + gap);
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  stages.forEach((st, i) => {
    const top = widthAt(st.value);
    const bot = i < stages.length - 1 ? widthAt(stages[i + 1].value) : top * 0.9;
    const y0 = i * (rowH + gap);
    const pts = [[(w - top) / 2, y0], [(w + top) / 2, y0], [(w + bot) / 2, y0 + rowH], [(w - bot) / 2, y0 + rowH]];
    s += `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" style="fill:${st.color}"/>`;
    s += `<text x="${w / 2}" y="${y0 + rowH / 2 - 3}" text-anchor="middle" class="ft-k" style="fill:${st.ink}">${st.key}</text>`;
    s += `<text x="${w / 2}" y="${y0 + rowH / 2 + 15}" text-anchor="middle" class="ft-v" style="fill:${st.ink}">${moneyShort(st.value)}</text>`;
  });
  s += `</svg>`;
  el.innerHTML = s;
}
