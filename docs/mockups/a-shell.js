function shell(active) {
  document.getElementById("side").innerHTML = `
    <div class="brand"><span class="mark">A</span>Accountable</div>
    <nav>${NAV.map(([n, i]) => `<a class="${n === active ? "on" : ""}"><span class="ic">${ICON[i]}</span>${n}</a>`).join("")}</nav>
    <div class="side-foot"><div class="who">J</div><div><div>Your workspace</div><div class="dim">Local</div></div></div>`;
}
function pageHeader({ crumb, title, sub, actions = "" }) {
  return `<header class="head"><div>
      ${crumb ? `<div class="crumbs"><a>${crumb}</a> / ${title}</div>` : ""}
      <h1>${title}</h1><p class="sub">${sub}</p></div>
    <div class="head-actions">${actions}</div></header>`;
}
