function app() {
"use strict";
// Admit Card Portal. Everything the page needs lives in this function, so the exam office can
// republish the page from its own source with new records (see buildPage).
const PAGE_TITLE = "Admit Card Portal";
const FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap">';
const XLSX_SRC = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const RESET = ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}img{max-width:100%}[hidden]{display:none!important}";

const CSS = `/*@@CSS@@*/`;
const CARD_CSS = `/*@@CARD_CSS@@*/`;

const MARKUP = `
<div class="portal">
  <header class="p-head">
    <div class="p-titles">
      <div class="p-inst" id="pInst"></div>
      <h1 id="pExam">Admit cards</h1>
    </div>
  </header>

  <section class="panel admin" id="admin" hidden>
    <div class="admin-head">
      <h2>Exam office</h2>
      <span class="tag">Only editors of this page see this panel</span>
    </div>
    <p class="hint" id="pubState"></p>
    <div class="admin-grid">
      <div class="admin-col">
        <label class="drop" id="drop" for="fileInput">
          <strong>Drop the exam schedule (.csv or .xlsx)</strong>
          <span class="hint">or click to choose a file</span>
        </label>
        <input type="file" id="fileInput" accept=".csv,.xlsx,.xls,.ods" hidden>
        <div class="actions"><button class="btn small" id="btnSample" type="button">Try with sample students</button></div>
        <p class="hint">One row per student per paper: <code>Registration No, Name, Father Name, Program, Course Code, Course Title, Date, Time, Room, Seat No</code>.</p>
        <div class="status" id="status" hidden></div>
      </div>
      <div class="admin-col">
        <div class="field"><label for="sInstitution">Institution</label><input type="text" id="sInstitution"></div>
        <div class="field"><label for="sCampus">Campus</label><input type="text" id="sCampus"></div>
        <div class="field"><label for="sExamTitle">Exam title</label><input type="text" id="sExamTitle"></div>
        <details class="more">
          <summary>Card wording</summary>
          <div>
            <div class="field"><label for="sSubtitle">Subtitle</label><input type="text" id="sSubtitle"></div>
            <div class="field"><label for="sNotice">Verification notice</label><input type="text" id="sNotice"></div>
            <div class="field"><label for="sSeating">Seating note</label><input type="text" id="sSeating"></div>
            <div class="field"><label for="sInstructions">Instructions (one per line)</label><textarea id="sInstructions"></textarea></div>
          </div>
        </details>
      </div>
    </div>
    <div class="publish-row">
      <button class="btn primary" id="btnPublish" type="button">Save exam details</button>
      <button class="btn" id="btnUnpublish" type="button" hidden>Remove published cards</button>
    </div>
    <div class="confirm" id="confirm" hidden>
      <p id="confirmText"></p>
      <div class="actions">
        <button class="btn primary" id="btnConfirm" type="button">Publish</button>
        <button class="btn" id="btnCancel" type="button">Cancel</button>
      </div>
    </div>
    <p class="msg" id="pubMsg" role="status"></p>
  </section>

  <section class="panel lookup" id="lookupPanel">
    <h2>Find your admit card</h2>
    <p class="hint" id="lookupHint">Enter your registration number as it appears on your campus card.</p>
    <form id="lookupForm" class="lookup-row" autocomplete="off">
      <div class="field grow"><label for="reg">Registration number</label><input type="text" id="reg" placeholder="e.g. FA23-BCS-014" spellcheck="false"></div>
      <button class="btn primary" type="submit" id="btnFind">Show my admit card</button>
    </form>
    <p class="msg" id="lookupMsg" role="status"></p>
  </section>

  <section class="result" id="result" hidden>
    <div class="result-bar">
      <span id="resultLabel"></span>
      <div class="actions">
        <button class="btn primary" id="btnDownload" type="button" hidden>Download card to print</button>
        <button class="btn" id="btnClear" type="button">Look up another number</button>
      </div>
    </div>
    <p class="hint" id="printHint" hidden>Open the downloaded file in your browser and press <b>Print admit card</b>.</p>
    <div class="scroller" id="cardBox"></div>
  </section>

  <p class="p-foot" id="pFoot"></p>
</div>`;

// ---------- Shared with the Admit Card Builder ----------
/*@@SHARED@@*/

const $ = (id) => document.getElementById(id);
const use = (name) => (window.claude && window.claude.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));

// ---------- Published state (embedded in the page) ----------
let published = null;
try { published = JSON.parse(document.getElementById("records").textContent); } catch (e) { published = null; }
if (!published || typeof published !== "object") published = { settings: null, salt: "", records: null, count: 0, publishedAt: null };
let settings = { ...DEFAULT_SETTINGS, ...(published.settings || {}) };
let staged = null;      // students loaded by the exam office, not yet published
let stagedName = "";
let downloads = null;
let isEditor = false;
let shown = null;       // student whose card is on screen

// ---------- Record locking ----------
// Each card is encrypted with a key derived from its own registration number, and filed under a
// hash of that number. The page holds no readable list: a card opens only for its number.
const enc = new TextEncoder();
const sha = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const toB64 = (b) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function recordId(salt, key) { return hex(await sha("id|" + salt + "|" + key)).slice(0, 32); }
async function recordKey(salt, key) { return crypto.subtle.importKey("raw", await sha("key|" + salt + "|" + key), "AES-GCM", false, ["encrypt", "decrypt"]); }
async function lockRecord(salt, s) {
  const body = { reg: s.reg, name: s.name, father: s.father, program: s.program,
    courses: s.courses.map((c) => ({ code: c.code, title: c.title, dateKey: c.dateKey, dateText: c.dateText, timeText: c.timeText, room: c.room, seat: c.seat, clash: !!c.clash })) };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await recordKey(salt, s.key), enc.encode(JSON.stringify(body))));
  return toB64(iv) + "." + toB64(ct);
}
async function unlockRecord(salt, key, blob) {
  const [iv, ct] = blob.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await recordKey(salt, key), fromB64(ct));
  return { key, ...JSON.parse(new TextDecoder().decode(pt)) };
}

// ---------- The page's own source, for republishing ----------
function buildPage(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>' + RESET + "</style></head><body>"
    + "<title>" + PAGE_TITLE + '</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + FONT_LINK + "\n"
    + '<script id="records" type="application/json">' + json + "<\/script>\n"
    + '<script src="' + XLSX_SRC + '"><\/script>\n'
    + "<script>\n" + app.toString() + "\napp();\n<\/script>\n</body></html>";
}

// ---------- Header, footer, state line ----------
function renderChrome() {
  $("pInst").textContent = [settings.institution, settings.campus].filter(Boolean).join(" · ");
  $("pExam").textContent = settings.examTitle || "Admit cards";
  const n = published.count || 0;
  const when = published.publishedAt ? new Date(published.publishedAt) : null;
  const whenText = when ? `${pad(when.getDate())} ${MONTHS[when.getMonth()]} ${when.getFullYear()}` : "";
  $("pFoot").textContent = published.records ? `Admit cards published ${whenText}. Contact the examination office if any detail on your card is wrong.` : "";
  if (!published.records && !staged) {
    $("lookupHint").textContent = "Admit cards for this exam have not been published yet. Check back later.";
    $("lookupForm").hidden = true;
  } else {
    $("lookupHint").textContent = staged ? `Previewing ${staged.length} unpublished card${staged.length === 1 ? "" : "s"} from ${stagedName}. Students cannot see these until you publish.` : "Enter your registration number as it appears on your campus card.";
    $("lookupForm").hidden = false;
  }
  if (isEditor) {
    $("pubState").textContent = published.records ? `${n} admit card${n === 1 ? "" : "s"} published on ${whenText}.` : "No admit cards are published yet. Load the schedule, check a few cards below, then publish.";
    $("btnPublish").textContent = staged ? `Publish ${staged.length} admit card${staged.length === 1 ? "" : "s"}` : "Save exam details";
    $("btnUnpublish").hidden = !published.records;
  }
}

// ---------- Student lookup ----------
function setMsg(id, text, tone) { const el = $(id); el.textContent = text; el.className = "msg" + (tone ? " " + tone : ""); }
function showCard(s, preview) {
  shown = s;
  $("cardBox").innerHTML = cardHTML(s, fmtStamp(new Date()));
  $("resultLabel").textContent = preview ? `Preview of ${s.reg} (not published)` : `Admit card for ${s.reg}`;
  $("btnDownload").hidden = !downloads;
  $("printHint").hidden = !downloads;
  $("result").hidden = false;
  setMsg("lookupMsg", "");
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function lookup() {
  const raw = $("reg").value.trim(), key = norm(raw);
  $("result").hidden = true; shown = null;
  if (!key) return setMsg("lookupMsg", "Enter your registration number first.", "warn");
  if (staged) {
    const s = staged.find((x) => x.key === key);
    return s ? showCard(s, true) : setMsg("lookupMsg", `${raw} is not in ${stagedName}.`, "warn");
  }
  if (!published.records) return setMsg("lookupMsg", "Admit cards have not been published yet.", "warn");
  if (!window.crypto || !crypto.subtle) return setMsg("lookupMsg", "This browser cannot open admit cards. Update it, or try another browser.", "warn");
  $("btnFind").disabled = true;
  try {
    const blob = published.records[await recordId(published.salt, key)];
    if (!blob) return setMsg("lookupMsg", `No admit card found for ${raw}. Check the number and try again, or contact the examination office.`, "warn");
    showCard(await unlockRecord(published.salt, key, blob), false);
  } catch (err) {
    setMsg("lookupMsg", "This admit card could not be opened. Contact the examination office.", "warn");
  } finally { $("btnFind").disabled = false; }
}
function cardFile(s) {
  const css = ":root{--paper:#fff;--ink:#111;--ink-soft:#444;--rule:#222;--band:#ececec;--font-card:Arial,'Helvetica Neue',Helvetica,sans-serif}"
    + "body{margin:0;background:#e9ecef;font-family:Arial,sans-serif}.bar{display:flex;justify-content:center;padding:16px}"
    + ".bar button{font:600 15px Arial,sans-serif;padding:10px 22px;border-radius:6px;border:0;background:#1d5ba6;color:#fff;cursor:pointer}"
    + ".wrap{overflow-x:auto;padding:0 16px 32px}" + CARD_CSS
    + "@page{size:A4;margin:8mm}@media print{body{background:#fff}.bar{display:none}.wrap{padding:0;overflow:visible}"
    + ".card{box-shadow:none;width:100%;min-height:0;height:279mm;padding:4mm 6mm}.c-table tr.clash td{background:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>Admit Card " + esc(s.reg) + "</title><style>" + css + "</style></head><body>"
    + "<div class=\"bar\"><button type=\"button\" onclick=\"window.print()\">Print admit card</button></div>"
    + "<div class=\"wrap\">" + cardHTML(s, fmtStamp(new Date())) + "</div></body></html>";
}
async function downloadCard() {
  if (!shown || !downloads) return;
  try {
    await downloads.save({ filename: `Admit Card ${shown.reg.replace(/[^\w-]+/g, "-")}.html`, data: cardFile(shown) });
  } catch (err) {
    if (err && err.code === "declined") return;
    if (err && ["unavailable", "not_granted", "capability_disabled", "capability_removed"].includes(err.code)) { downloads = null; $("btnDownload").hidden = true; $("printHint").hidden = true; return; }
    setMsg("lookupMsg", "The card could not be downloaded. Try again in a moment.", "warn");
  }
}

// ---------- Exam office ----------
const FIELDS = { institution: "sInstitution", campus: "sCampus", examTitle: "sExamTitle", subtitle: "sSubtitle", notice: "sNotice", seating: "sSeating", instructions: "sInstructions" };
function fillForm() { for (const [k, id] of Object.entries(FIELDS)) $(id).value = settings[k] || ""; }
function showStatus(text, issues, warn) {
  const el = $("status");
  el.hidden = false;
  el.className = "status " + (warn ? "warn" : "ok");
  el.innerHTML = esc(text) + (issues.length ? "<ul>" + issues.map((i) => `<li>${esc(i)}</li>`).join("") + "</ul>" : "");
}
function afterSettingsChange() { renderChrome(); if (shown) $("cardBox").innerHTML = cardHTML(shown, fmtStamp(new Date())); }
function stage(list, name) {
  staged = list; stagedName = name;
  $("result").hidden = true; shown = null; $("confirm").hidden = true;
  renderChrome();
  if (list[0]) { $("reg").value = list[0].reg; lookup(); }
}
async function handleFile(file) {
  let wb;
  try {
    wb = /\.(csv|txt)$/i.test(file.name)
      ? XLSX.read(await readCsvCompact(file), { type: "string", raw: true })
      : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellStyles: false, cellHTML: false, cellText: false });
  } catch (err) {
    return showStatus(`Could not read ${file.name}.`, ["Save it as .xlsx or .csv and try again. Error: " + String(err.message || err)], true);
  }
  const settingsName = wb.SheetNames.find((n) => norm(n) === "settings");
  if (settingsName) { readSettingsSheet(wb.Sheets[settingsName]); fillForm(); }
  const dataName = wb.SheetNames.find((n) => n !== settingsName) || wb.SheetNames[0];
  const { list, issues } = buildStudents(sheetRows(wb.Sheets[dataName]));
  showStatus(list.length ? `Loaded ${list.length} student(s) from ${file.name}. Check a few cards below, then publish.` : `Nothing loaded from ${file.name}.`, issues, !list.length || issues.length > 0);
  if (list.length) stage(list, file.name);
}
let pendingAction = null;
function askConfirm(text, label, action) {
  pendingAction = action;
  $("confirmText").textContent = text;
  $("btnConfirm").textContent = label;
  $("confirm").hidden = false;
  setMsg("pubMsg", "");
}
async function publishData(data, doneText) {
  const html = buildPage(data);
  if (html.length > 15.5 * 1048576) return setMsg("pubMsg", `This is too much to publish in one page (${(html.length / 1048576).toFixed(1)} MB; the limit is 16 MB). Publish fewer students per page, for example one program at a time.`, "warn");
  const artifact = await use("artifact");
  if (!artifact) return setMsg("pubMsg", "Publishing is not available here. Open this page on claude.ai as its owner or an editor.", "warn");
  try { sessionStorage.setItem("portalNotice", doneText); } catch (e) { /* the notice is optional */ }
  try {
    await artifact.publish(html);
  } catch (err) {
    const code = err && err.code;
    if (code === "conflict") return setMsg("pubMsg", "Someone published a newer version just now. The page is reloading to it; publish again once it loads.", "warn");
    if (code === "not_writer" || code === "not_granted" || code === "consent_required" || code === "capability_disabled") { isEditor = false; $("admin").hidden = true; return; }
    if (code === "too_large") return setMsg("pubMsg", "This is too much to publish in one page. Publish fewer students per page, for example one program at a time.", "warn");
    if (code === "rate_limited") return setMsg("pubMsg", "Too many publishes in a short time. Wait a minute, then publish again.", "warn");
    setMsg("pubMsg", "Publishing failed. Try again in a minute.", "warn");
  }
}
async function publishStaged() {
  $("btnConfirm").disabled = true; $("btnPublish").disabled = true;
  try {
    let salt = published.salt, records = published.records, count = published.count || 0, publishedAt = published.publishedAt;
    if (staged) {
      salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
      records = {};
      for (let i = 0; i < staged.length; i++) {
        records[await recordId(salt, staged[i].key)] = await lockRecord(salt, staged[i]);
        if (i % 200 === 199) { setMsg("pubMsg", `Locking cards: ${i + 1} of ${staged.length}`); await new Promise((r) => setTimeout(r)); }
      }
      count = staged.length; publishedAt = new Date().toISOString();
    }
    setMsg("pubMsg", "Publishing...");
    await publishData({ settings, salt, records, count, publishedAt }, staged ? `Published ${count} admit card${count === 1 ? "" : "s"}. Students can look up their cards now.` : "Exam details saved.");
  } finally { $("btnConfirm").disabled = false; $("btnPublish").disabled = false; }
}

// ---------- Boot ----------
const style = document.createElement("style");
style.textContent = CSS + CARD_CSS;
document.body.prepend(style);
const root = document.createElement("div");
root.innerHTML = MARKUP;
document.body.appendChild(root);

renderChrome();
$("lookupForm").addEventListener("submit", (e) => { e.preventDefault(); lookup(); });
$("btnClear").addEventListener("click", () => { $("result").hidden = true; shown = null; $("reg").value = ""; $("reg").focus(); });
$("btnDownload").addEventListener("click", downloadCard);
try {
  const notice = sessionStorage.getItem("portalNotice");
  if (notice) { sessionStorage.removeItem("portalNotice"); setMsg("pubMsg", notice, "ok"); }
} catch (e) { /* storage unavailable */ }

use("downloads").then((d) => { downloads = d; if (shown) { $("btnDownload").hidden = !d; $("printHint").hidden = !d; } });
use("user").then(async (user) => {
  isEditor = user ? await user.canEdit().catch(() => false) : false;
  if (!isEditor) return;
  $("admin").hidden = false;
  fillForm();
  renderChrome();
  for (const [k, id] of Object.entries(FIELDS)) $(id).addEventListener("input", (e) => { settings[k] = e.target.value; afterSettingsChange(); });
  $("fileInput").addEventListener("change", (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; });
  const drop = $("drop");
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
  $("btnSample").addEventListener("click", () => {
    const wb = XLSX.read(SAMPLE_CSV, { type: "string", raw: true });
    showStatus("Loaded 3 sample students. These are examples; load your own file before publishing.", [], true);
    stage(buildStudents(sheetRows(wb.Sheets[wb.SheetNames[0]])).list, "the sample");
  });
  $("btnPublish").addEventListener("click", () => {
    const now = published.count || 0;
    askConfirm(staged
      ? (now ? `Replace the ${now} published card${now === 1 ? "" : "s"} with ${staged.length} card${staged.length === 1 ? "" : "s"} from ${stagedName}? Students will see the new cards straight away.` : `Publish ${staged.length} admit card${staged.length === 1 ? "" : "s"} from ${stagedName}? Students can look up their cards straight away.`)
      : "Save the exam details shown above to the published page?",
      staged ? "Publish" : "Save", publishStaged);
  });
  $("btnUnpublish").addEventListener("click", () => askConfirm(`Remove all ${published.count || 0} published admit cards? Students will see that cards are not published yet.`, "Remove cards",
    () => publishData({ settings, salt: "", records: null, count: 0, publishedAt: null }, "Published cards removed.")));
  $("btnCancel").addEventListener("click", () => { $("confirm").hidden = true; pendingAction = null; });
  $("btnConfirm").addEventListener("click", () => { $("confirm").hidden = true; const a = pendingAction; pendingAction = null; if (a) a(); });
});
}
