function shell(active) {
  document.getElementById("top").innerHTML = `
    <div class="brand"><i></i>Accountable</div>
    <nav>${NAV.map(([n]) => `<a class="${n === active ? "on" : ""}">${n}</a>`).join("")}</nav>
    <div class="right">
      <div class="search"><span class="ic">${ICON.search}</span>Search everything</div>
      <button class="btn"><span class="ic">${ICON.plus}</span>New deal</button>
    </div>`;
}
function pageHeader({ crumb, title, sub, line, actions = "" }) {
  const eyebrow = crumb ? `<span class="crumb-e"><a>${crumb}</a> / ${sub}</span>` : title;
  return `<section class="intro"><div>
      <div class="eyebrow">${eyebrow}</div>
      <h1 class="headline">${line || title}</h1></div>
    <div class="head-actions">${actions}</div></section>`;
}
