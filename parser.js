// Chrono Script Order PDF parser (plain JS, no JSX/build step — window global, matches app conventions)
// Parses the "<Title> - Chrono Script Order" table export: one scene per two text lines
// (scene header line + era/synopsis line), reconstructed from PDF word positions.

(function () {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  const HEADER_RE = /^(\d+(?:\.\d+)?[a-zA-Z0-9]*)\s+(EXT|INT|I\+E)\/([A-Z]+)\s+([A-Z])\/\s*(.*)$/;
  const YEAR_RE = /^(.*?)\b(\d{4})\b\s*(.*)$/;
  const NUMTOKEN_RE = /^\d+(\/\d+)?$/;
  const GAP_THRESHOLD = 20;

  const COUNTRY_MAP = {
    Y: { episode: "ep2", country: "Yugoslavia" },
    F: { episode: "ep1", country: "France" },
    N: { episode: "ep3", country: "The Netherlands" },
    G: { episode: "ep4", country: "Germany" },
  };
  const TOD_MAP = {
    DA: "DAY", DAY: "DAY",
    NIG: "NIGHT", NIGHT: "NIGHT", NI: "NIGHT",
    DU: "DUSK", DUSK: "DUSK",
    MO: "DAWN", MORNING: "DAWN", DAWN: "DAWN",
  };
  const PH_HINTS = ["interior", "room", "facade", "street", "landscape"];

  function titleCaseWord(w) {
    return w.replace(/\p{L}+/gu, (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
  }

  // ── PDF text extraction: items (which may span multiple words, plus
  // explicit whitespace-only items whose width signals gaps/column breaks),
  // clustered into visual rows by y-proximity (pdf.js emits slight sub-pixel
  // y jitter within the same table row, e.g. bold vs regular baselines) ──
  const ROW_Y_TOLERANCE = 4;

  async function extractRows(file) {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const rows = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const items = content.items
        .map((it) => ({ text: it.str, x0: it.transform[4], w: it.width, y: it.transform[5] }))
        .sort((a, b) => b.y - a.y || a.x0 - b.x0);

      let row = [];
      let rowY = null;
      const flush = () => { if (row.length) rows.push(row); row = []; };
      items.forEach((it) => {
        if (rowY == null || Math.abs(it.y - rowY) > ROW_Y_TOLERANCE) {
          flush();
          rowY = it.y;
        }
        row.push(it);
      });
      flush();
    }
    return rows;
  }

  function splitColumns(rowItems) {
    const ws = rowItems.slice().sort((a, b) => a.x0 - b.x0);
    const cols = [];
    let cur = "";
    ws.forEach((it) => {
      if (!it.text.trim()) {
        if (it.w > GAP_THRESHOLD) {
          if (cur.trim()) cols.push(cur.trim());
          cur = "";
        } else if (cur) {
          cur += " ";
        }
        return;
      }
      cur += it.text;
    });
    if (cur.trim()) cols.push(cur.trim());
    return cols;
  }

  function splitRestCols(restCols) {
    let place = "", pagelen = "", continuity = "", trailing = "";
    if (!restCols.length) return { place, pagelen, continuity, trailing };
    let main = restCols[0];
    if (restCols.length >= 2) trailing = restCols[restCols.length - 1].trim();
    const tokens = main.split(/\s+/).filter(Boolean);
    let idx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (NUMTOKEN_RE.test(tokens[i])) { idx = i; break; }
    }
    if (idx === -1) {
      place = main.trim();
    } else {
      place = tokens.slice(0, idx).join(" ");
      pagelen = tokens[idx];
      continuity = tokens.slice(idx + 1).join(" ");
    }
    return { place, pagelen, continuity, trailing };
  }

  // ── Raw row stream -> scene draft records (mirrors the validated parser) ──
  function parseRows(rows) {
    const scenes = [];
    let cur = null;
    let stage = 0; // 0 = between scenes, 1 = expect header, 2 = expect era/synopsis line
    rows.forEach((ws) => {
      const cols = splitColumns(ws);
      const rawLine = cols.join(" ");
      if (
        rawLine.startsWith("The Camino") ||
        rawLine.indexOf("Chrono Script Order") !== -1 ||
        /^page\s*#\s*\d+$/.test(rawLine)
      ) {
        return;
      }
      const hm = HEADER_RE.exec(rawLine);
      if (hm) {
        if (cur) scenes.push(cur);
        const [, num, ie, tod, country] = hm;
        const prefixMatch = /^\S+\s+\S+\s+\S+\s*/.exec(cols[0]);
        const location = prefixMatch ? cols[0].slice(prefixMatch[0].length).trim() : "";
        const { place, pagelen, continuity, trailing } = splitRestCols(cols.slice(1));
        cur = {
          num, ie, tod, country, location, place, pagelen, continuity, trailing,
          eraRaw: "", year: "", synopsis: "", tags: [],
        };
        stage = 2;
        return;
      }
      if (!cur) return;
      if (stage === 2) {
        const ym = YEAR_RE.exec(rawLine);
        if (ym) {
          const [, eraRaw, year, rest] = ym;
          cur.eraRaw = eraRaw.trim();
          cur.year = year;
          const pgsSplit = rest.split(/\s*\bpgs\b\s*/);
          cur.synopsis = pgsSplit[0].trim();
          if (pgsSplit[1] && pgsSplit[1].trim()) cur.tags.push(pgsSplit[1].trim());
          stage = 3;
          return;
        }
      }
      cur.tags.push(rawLine.trim());
    });
    if (cur) scenes.push(cur);
    return scenes;
  }

  // ── Map a raw scene draft to the app's Scene-import shape ──
  function toSceneDraft(raw, i) {
    const ctry = COUNTRY_MAP[raw.country] || COUNTRY_MAP.F;
    const dn = TOD_MAP[raw.tod] || "DAY";
    const intExt = raw.ie === "I+E" ? "I+E" : raw.ie;

    let group = "", sub = raw.location;
    if (raw.place) {
      group = raw.place.replace(/\?$/, "");
      sub = raw.location;
    } else if (raw.location.indexOf("/") !== -1) {
      const parts = raw.location.split("/").map((s) => s.trim()).filter(Boolean);
      group = parts[0];
      sub = parts.slice(1).join(" / ");
    }
    const slug = (group ? `${group} — ${sub || group}` : sub || raw.location || "Untitled")
      .toUpperCase()
      .replace(/\s*\/\s*/g, " / ");

    // notes is just the synopsis — the scene description is what a location
    // scout actually needs to see at a glance on the card. Screenplay-internal
    // bookkeeping (era, page length, continuity numbers, story-day refs,
    // camera/safety tags) goes in sceneInfo instead, a separate field so it
    // can be styled (small, italic, muted) without competing with the actual
    // description for attention or living inside the same plain-text box.
    const eraLine = [raw.eraRaw, raw.year].filter(Boolean).join(" ").trim();
    const metaBits = [];
    if (raw.pagelen) metaBits.push(raw.pagelen);
    if (raw.continuity) metaBits.push(`cont. ${raw.continuity}`);
    if (raw.trailing) metaBits.push(`day ref ${raw.trailing}`);
    const tagText = raw.tags.join(" ").trim();
    if (tagText) metaBits.push(tagText);

    const notes = raw.synopsis || "";
    const sceneInfo = [
      eraLine ? `(${eraLine})` : "",
      metaBits.length ? metaBits.join(" · ") : "",
    ].filter(Boolean).join("\n");

    return {
      tmpId: `chrono-${raw.num}`,
      episode: ctry.episode,
      country: ctry.country,
      scene: raw.num,
      intExt,
      dn,
      slug,
      address: raw.place ? titleCaseWord(raw.place.replace(/\?$/, "")) : "",
      notes,
      sceneInfo,
      photoHint: PH_HINTS[i % PH_HINTS.length],
    };
  }

  async function parseChronoPdf(file) {
    const rows = await extractRows(file);
    const raw = parseRows(rows);
    return raw.map(toSceneDraft);
  }

  window.parseChronoPdf = parseChronoPdf;
})();
