function shell(active) {
  document.getElementById("rail").innerHTML =
    `<div class="mark">a</div>` +
    NAV.map(([n, i]) => `<a class="${n === active ? "on" : ""}" title="${n}">${ICON[i]}</a>`).join("");
}
function pageHeader({ crumb, title, sub, actions = "" }) {
  return `<div class="bar">
      ${crumb ? `<span class="crumb"><a class="link">${crumb}</a> /</span>` : ""}
      <h1>${title}</h1><span class="crumb">${sub}</span>
      <span class="sp"></span>${actions}</div>`;
}
const initials = (s) => s.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
