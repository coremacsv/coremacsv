// Legge i repository pubblici di coremacsv dalle API di GitHub e aggiorna
// il blocco tra i marcatori <!--STATS:START--> e <!--STATS:END--> nel README.
// Usa solo l'endpoint pubblico (/users/:login/repos): anche con un token,
// questo endpoint restituisce solo i repository pubblici, mai quelli privati.

const fs = require("fs");

const USERNAME = process.env.GITHUB_REPOSITORY_OWNER || "coremacsv";
const README_PATH = "README.md";
const START = "<!--STATS:START-->";
const END = "<!--STATS:END-->";

function giorniFa(dataIso) {
  const ms = Date.now() - new Date(dataIso).getTime();
  const giorni = Math.floor(ms / 86400000);
  if (giorni <= 0) return "oggi";
  if (giorni === 1) return "ieri";
  return giorni + " giorni fa";
}

async function main() {
  const res = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&type=public`, {
    headers: { "User-Agent": "coremacsv-profile-bot", Accept: "application/vnd.github+json" }
  });
  if (!res.ok) {
    console.error("Errore dalle API di GitHub:", res.status);
    process.exit(0); // non far fallire la pipeline per un problema temporaneo delle API
  }
  const repos = (await res.json()).filter((r) => !r.fork);
  if (repos.length === 0) {
    console.error("Nessun repository pubblico trovato, lascio il README com'è.");
    process.exit(0);
  }

  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const mostRecent = repos.slice().sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))[0];

  const block =
    `${START}\n` +
    `**${repos.length}** progetti pubblici · **${totalStars}** stelle totali\n` +
    `Ultimo aggiornamento: **${mostRecent.name}**, ${giorniFa(mostRecent.pushed_at)}\n\n` +
    `<sub>Si aggiorna da solo ogni notte, niente da toccare.</sub>\n` +
    `${END}`;

  const readme = fs.readFileSync(README_PATH, "utf8");
  if (!readme.includes(START) || !readme.includes(END)) {
    console.error("Marcatori STATS non trovati nel README, non tocco nulla.");
    process.exit(0);
  }
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  const updated = readme.replace(re, block);
  fs.writeFileSync(README_PATH, updated);
  console.log("README aggiornato.");
}

main();
