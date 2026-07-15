// app.jsx — main app

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "studio",
  "accent": "#9C6A3F",
  "cardStyle": "photo-forward",
  "showAddressOnCard": true,
  "productionType": "series",
  "gridCols": 4
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const project = window.STORY.PROJECT; // set by index.html's boot script for ?project= loads

  // A freshly created project may start in Film mode — apply that once, without
  // touching the static TWEAK_DEFAULTS block the design-mode host rewrites on disk.
  useEffect(() => {
    if (project?.type) setTweak("productionType", project.type);
  }, []);

  // ── App data state ─────────────────────────────────────
  const [scenes, setScenes] = useState(window.STORY.SCENES);
  const [suggestions, setSuggestions] = useState(window.STORY.SUGGESTIONS);
  const [groupNames, setGroupNames] = useState(() => {
    const s = new Set();
    window.STORY.SCENES.forEach(sc => { if (sc.group) s.add(sc.group); });
    return [...s];
  });
  const [view, setView] = useState("grid"); // grid | groups | map
  const [filter, setFilter] = useState({ kind: "all", value: null }); // all | episode | country | status | group
  const [search, setSearch] = useState("");
  const [openScene, setOpenScene] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareScope, setShareScope] = useState(null); // null = whole storyboard, or { type:"group", name }
  const [exportOpen, setExportOpen] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [printPerPage, setPrintPerPage] = useState("smart"); // smart | 4 | 6 | 9
  const [toast, setToast] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  const isFilm = t.productionType === "film";

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.theme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
  }, [t.accent]);
  useEffect(() => {
    document.documentElement.style.setProperty("--grid-cols", t.gridCols);
  }, [t.gridCols]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(tm);
  }, [toast]);

  // ── Derived ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = scenes;
    if (filter.kind === "episode")  list = list.filter(s => s.episode === filter.value);
    if (filter.kind === "country")  list = list.filter(s => {
      const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
      return ep?.country === filter.value;
    });
    if (filter.kind === "status")   list = list.filter(s => s.status === filter.value);
    if (filter.kind === "group")    list = list.filter(s => s.group === filter.value);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.slug.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        (s.group || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (a.shootIndex ?? 999) - (b.shootIndex ?? 999));
  }, [scenes, filter, search]);

  const counts = useMemo(() => {
    const byEp = {}, byCountry = {}, byStatus = {}, byGroup = {};
    scenes.forEach(s => {
      byEp[s.episode] = (byEp[s.episode] || 0) + 1;
      const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
      if (ep) byCountry[ep.country] = (byCountry[ep.country] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      if (s.group) byGroup[s.group] = (byGroup[s.group] || 0) + 1;
    });
    return { byEp, byCountry, byStatus, byGroup };
  }, [scenes]);

  const groupsList = useMemo(() => {
    const m = new Map();
    groupNames.forEach(name => m.set(name, []));
    scenes.forEach(s => {
      if (!s.group) return;
      if (!m.has(s.group)) m.set(s.group, []);
      m.get(s.group).push(s);
    });
    return [...m.entries()].map(([name, items]) => ({ name, items }));
  }, [scenes, groupNames]);

  function createGroup(name) {
    const clean = (name || "").trim();
    if (!clean) return null;
    setGroupNames(prev => prev.includes(clean) ? prev : [...prev, clean]);
    setToast(`Group "${clean}" created`);
    return clean;
  }
  function promptNewGroup(assignSceneId) {
    const name = window.prompt("New location group name:");
    if (!name || !name.trim()) return;
    const clean = createGroup(name);
    if (assignSceneId && clean) updateScene(assignSceneId, { group: clean });
  }
  function deleteGroup(name) {
    if (!window.confirm(`Delete group "${name}"? Scenes stay, they'll just be ungrouped.`)) return;
    setScenes(prev => prev.map(s => s.group === name ? { ...s, group: null } : s));
    setGroupNames(prev => prev.filter(g => g !== name));
    if (filter.kind === "group" && filter.value === name) setFilter({ kind: "all" });
    setToast(`Group "${name}" deleted`);
  }

  // ── Mutators ───────────────────────────────────────────
  function updateScene(id, patch) {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    if (openScene?.id === id) setOpenScene(prev => ({ ...prev, ...patch }));
  }
  function deleteScene(id) {
    if (!window.confirm("Delete this scene? This can't be undone.")) return;
    setScenes(prev => prev.filter(s => s.id !== id));
    if (openScene?.id === id) setOpenScene(null);
    setToast("Scene deleted");
  }
  function duplicateScene(id) {
    setScenes(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const src = prev[idx];
      const copy = { ...src, id: `dup${Date.now()}${Math.random().toString(36).slice(2,6)}`, comments: [...src.comments] };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setToast("Scene duplicated");
  }
  function reorderScene(dragId, targetId) {
    if (dragId === targetId) return;
    setScenes(prev => {
      const list = [...prev];
      const from = list.findIndex(s => s.id === dragId);
      const to = list.findIndex(s => s.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return list;
    });
  }
  function addComment(id, comment) {
    setScenes(prev => prev.map(s => s.id === id
      ? { ...s, comments: [...s.comments, comment] }
      : s));
    if (openScene?.id === id) {
      setOpenScene(prev => ({ ...prev, comments: [...prev.comments, comment] }));
    }
    setToast("Comment added");
  }
  function acceptSuggestion(sug) {
    setScenes(prev => prev.map(s => sug.sceneIds.includes(s.id) ? { ...s, group: sug.name } : s));
    setGroupNames(prev => prev.includes(sug.name) ? prev : [...prev, sug.name]);
    setSuggestions(prev => prev.filter(x => x.id !== sug.id));
    setToast(`Group "${sug.name}" created with ${sug.sceneIds.length} scene${sug.sceneIds.length>1?"s":""}`);
  }
  function dismissSuggestion(sug) {
    setSuggestions(prev => prev.filter(x => x.id !== sug.id));
  }
  function importScenes(items) {
    let nextId = scenes.length;
    const maxIdx = Math.max(0, ...scenes.map(s => s.shootIndex ?? 0));
    const maxDay = Math.max(0, ...scenes.map(s => s.shootDay ?? 0));
    const PH_HINTS = ["interior","room","facade","street","landscape"];
    const newScenes = items.map((p,i) => ({
      id: `imp${++nextId}`,
      scene: p.scene,
      episode: p.episode,
      intExt: p.intExt,
      dn: p.dn,
      slug: p.slug,
      address: p.address,
      status: "todo",
      group: null,
      photoHint: p.photoHint || PH_HINTS[i % PH_HINTS.length],
      notes: p.notes || "",
      comments: [],
      shootDay: maxDay + 1,
      shootIndex: maxIdx + 1 + i,
    }));
    setScenes(prev => [...prev, ...newScenes]);
    // generate new suggestions based on slug similarity
    const slugRoot = s => s.split("—")[0].trim();
    const buckets = {};
    [...scenes, ...newScenes].forEach(s => {
      if (s.group) return;
      const k = slugRoot(s.slug);
      buckets[k] = buckets[k] || [];
      buckets[k].push(s.id);
    });
    const newSugs = Object.entries(buckets)
      .filter(([k, ids]) => ids.length >= 2)
      .slice(0, 3)
      .map((entry, i) => ({
        id: `sugimp${i+1}`,
        name: entry[0].replace(/\s+\(.*\)/, ""),
        reason: `${entry[1].length} scenes share "${entry[0]}"`,
        sceneIds: entry[1],
        confidence: 0.78 + i * 0.04,
      }));
    setSuggestions(prev => [...newSugs, ...prev]);
    setToast(`Imported ${items.length} scenes from Fuzzlecheck`);
  }

  // ── Sidebar ────────────────────────────────────────────
  function Sidebar() {
    return (
      <aside className="sidebar" onClick={() => setNavOpen(false)}>
        <div className="side-section">
          <SideItem active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })}
                    count={scenes.length}>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <Icon name="folder" size={13}/>All scenes
            </span>
          </SideItem>
        </div>

        {!isFilm && (
        <div className="side-section">
          <div className="side-h"><span>Episodes</span></div>
          {window.STORY.EPISODES.map(e => (
            <SideItem key={e.id}
              active={filter.kind === "episode" && filter.value === e.id}
              onClick={() => setFilter({ kind: "episode", value: e.id })}
              count={counts.byEp[e.id] || 0}
              dot={e.color}>
              {e.n} · {e.title}
            </SideItem>
          ))}
        </div>
        )}

        <div className="side-section">
          <div className="side-h"><span>Countries</span></div>
          {[
            { name: "France", flag: window.STORY.FLAG_FR },
            { name: "Yugoslavia", flag: window.STORY.FLAG_YU },
            { name: "The Netherlands", flag: window.STORY.FLAG_NL },
            { name: "Germany", flag: window.STORY.FLAG_DE },
          ].map(c => (
            <SideItem key={c.name}
              active={filter.kind === "country" && filter.value === c.name}
              onClick={() => setFilter({ kind: "country", value: c.name })}
              count={counts.byCountry[c.name] || 0}
              flag={c.flag}>
              {c.name}
            </SideItem>
          ))}
        </div>

        <div className="side-section">
          <div className="side-h">
            <span>Location groups</span>
            <button className="add" title="New group" onClick={() => promptNewGroup()}><Icon name="plus" size={12}/></button>
          </div>
          {groupsList.map(g => (
            <SideItem key={g.name}
              active={filter.kind === "group" && filter.value === g.name}
              onClick={() => setFilter({ kind: "group", value: g.name })}
              count={g.items.length}
              dot="oklch(0.55 0.13 60)"
              onDelete={() => deleteGroup(g.name)}>
              {g.name}
            </SideItem>
          ))}
          {suggestions.length > 0 && (
            <div style={{
              marginTop:8,padding:"7px 8px",
              fontSize:11,color:"var(--ink-3)",
              display:"flex",alignItems:"center",gap:6,
            }}>
              <Icon name="sparkle" size={12}/>
              <span>{suggestions.length} suggested group{suggestions.length>1?"s":""}</span>
            </div>
          )}
        </div>

        <div className="side-section">
          <div className="side-h"><span>Status</span></div>
          {Object.entries(STATUS).map(([k, v]) => (
            <SideItem key={k}
              active={filter.kind === "status" && filter.value === k}
              onClick={() => setFilter({ kind: "status", value: k })}
              count={counts.byStatus[k] || 0}>
              <span className={`status ${k}`} style={{fontSize:13,color:"inherit"}}>
                <span className="dot"></span>{v.label}
              </span>
            </SideItem>
          ))}
        </div>
      </aside>
    );
  }

  // ── Page head (title + stats) ──────────────────────────
  function PageHead() {
    const epCount = window.STORY.EPISODES.length;
    const countryCount = new Set(window.STORY.EPISODES.map(e => e.country)).size;
    let title = "All scenes";
    let sub = isFilm ? `Across ${countryCount} countries` : `Across ${epCount} episodes and ${countryCount} countries`;
    if (filter.kind === "episode" && !isFilm) {
      const ep = window.STORY.EPISODES.find(e => e.id === filter.value);
      title = `EP ${ep?.n} · ${ep?.title}`;
      sub = [ep?.country, ep?.era].filter(Boolean).join(" · ");
    } else if (filter.kind === "country") {
      title = filter.value;
      const ep = window.STORY.EPISODES.find(e => e.country === filter.value);
      sub = `${counts.byCountry[filter.value] || 0} scenes${ep?.era ? ` · ${ep.era}` : ""}`;
    } else if (filter.kind === "status") {
      title = STATUS[filter.value]?.label;
      sub = `${counts.byStatus[filter.value] || 0} scenes`;
    } else if (filter.kind === "group") {
      title = filter.value;
      sub = `Location group · ${counts.byGroup[filter.value] || 0} scenes`;
    }

    return (
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span>{project?.name || "The Camino"}</span><span className="sep">/</span>
            {!isFilm && !project && <><span>Season 1</span><span className="sep">/</span></>}
            <span style={{color:"var(--ink-2)"}}>{view === "grid" ? "Scenes" : view === "groups" ? "Groups" : "Map"}</span>
          </div>
          <h1>{title}</h1>
          <div className="sub">{sub}</div>
        </div>
        <div className="stat">
          <div>
            <div className="n">{filtered.length}</div>
            <div className="l">Scenes</div>
          </div>
          <div>
            <div className="n">{groupsList.length}</div>
            <div className="l">Groups</div>
          </div>
          <div>
            <div className="n">{counts.byStatus.locked || 0}</div>
            <div className="l">Locked</div>
          </div>
        </div>
      </div>
    );
  }

  // Pack scenes into A4 pages: keep location groups together where possible,
  // split only when a group is bigger than the page capacity.
  function computePrintPages(scenesList, perPageSetting) {
    const perPage = perPageSetting === "smart"
      ? (scenesList.length <= 12 ? 4 : scenesList.length <= 30 ? 6 : 9)
      : Number(perPageSetting);
    const units = [];
    let i = 0;
    while (i < scenesList.length) {
      const s = scenesList[i];
      if (s.group) {
        let j = i;
        while (j < scenesList.length && scenesList[j].group === s.group) j++;
        units.push({ group: s.group, items: scenesList.slice(i, j) });
        i = j;
      } else {
        units.push({ group: null, items: [s] });
        i++;
      }
    }
    const pages = [];
    let current = [];
    function pushPage() { if (current.length) pages.push(current); current = []; }
    units.forEach(u => {
      if (u.items.length > perPage) {
        pushPage();
        for (let k = 0; k < u.items.length; k += perPage) {
          pages.push(u.items.slice(k, k + perPage).map(sc => ({ scene: sc, group: u.group })));
        }
        return;
      }
      if (current.length + u.items.length > perPage) pushPage();
      u.items.forEach(sc => current.push({ scene: sc, group: u.group }));
    });
    pushPage();
    return { pages, perPage };
  }

  function exportCSV() {
    const header = ["Episode","Scene","INT/EXT","Day/Night","Location","Address","Country","Status","Group","Script Day","Notes"];
    const rows = scenes.map(s => {
      const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
      return [
        isFilm ? "" : ep?.n,
        s.scene, s.intExt, s.dn, s.slug, s.address, ep?.country,
        STATUS[s.status]?.label || s.status, s.group || "", s.shootDay || "", s.notes || "",
      ];
    });
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "camino-storyboard.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    setToast("CSV exported");
  }
  function exportPDF() {
    setExportOpen(false);
    setShowPrint(true);
  }

  // drag state for manual reorder
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [layout, setLayout] = useState("cards"); // cards | large | list

  // ── Grid view ──────────────────────────────────────────
  function GridView() {
    const commonProps = s => ({
      key: s.id,
      scene: s,
      onOpen: () => setOpenScene(s),
      onUpdate: patch => updateScene(s.id, patch),
      isFilm,
      draggable: true,
      dragOver: dragOverId === s.id,
      onDragStart: e => { setDragId(s.id); e.dataTransfer.effectAllowed = "move"; },
      onDragOver: e => { e.preventDefault(); setDragOverId(s.id); },
      onDrop: e => { e.preventDefault(); if (dragId) reorderScene(dragId, s.id); setDragId(null); setDragOverId(null); },
      onDragEnd: () => { setDragId(null); setDragOverId(null); },
      onDuplicate: () => duplicateScene(s.id),
      onDelete: () => deleteScene(s.id),
    });
    return (
      <>
        <div className="filters">
          <button className={"chip" + (filter.kind === "all" ? " active" : "")}
                  onClick={() => setFilter({ kind: "all" })}>All</button>
          <button className={"chip" + (filter.kind === "status" && filter.value === "todo" ? " active" : "")}
                  onClick={() => setFilter({ kind: "status", value: "todo" })}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"oklch(0.7 0.13 60)"}}></span>To scout
          </button>
          <button className={"chip" + (filter.kind === "status" && filter.value === "scouted" ? " active" : "")}
                  onClick={() => setFilter({ kind: "status", value: "scouted" })}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"oklch(0.65 0.13 230)"}}></span>Scouted
          </button>
          <button className={"chip" + (filter.kind === "status" && filter.value === "locked" ? " active" : "")}
                  onClick={() => setFilter({ kind: "status", value: "locked" })}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"oklch(0.58 0.11 150)"}}></span>Locked
          </button>
          <div style={{flex:1}}></div>
          <span style={{fontSize:11.5,color:"var(--ink-3)"}}>
            Drag the handle to reorder
          </span>
          <div className="layout-toggle">
            <button className={layout === "cards" ? "active" : ""} onClick={() => setLayout("cards")} title="Cards">
              <Icon name="grid" size={13}/>Cards
            </button>
            <button className={layout === "large" ? "active" : ""} onClick={() => setLayout("large")} title="Large / gallery">
              <Icon name="file" size={13}/>Gallery
            </button>
            <button className={layout === "list" ? "active" : ""} onClick={() => setLayout("list")} title="List">
              <Icon name="folder" size={13}/>List
            </button>
          </div>
        </div>

        {layout === "list" ? (
          <div className="row-list">
            {filtered.map(s => <SceneRow {...commonProps(s)}/>)}
          </div>
        ) : (
          <div className="grid" style={layout === "large" ? { "--grid-cols": Math.max(1, Math.min(2, t.gridCols)) } : undefined}>
            {filtered.map(s => <SceneCard {...commonProps(s)} showGroup size={layout === "large" ? "lg" : "md"}/>)}
          </div>
        )}
        {filtered.length === 0 && (
          <div style={{padding:"60px 0",textAlign:"center",color:"var(--ink-3)"}}>
            No scenes match the current filter.
          </div>
        )}
      </>
    );
  }

  // ── Groups view ────────────────────────────────────────
  function GroupsView() {
    return (
      <div className="groups-list">
        {suggestions.length > 0 && (
          <div>
            <div className="section-h" style={{marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <Icon name="sparkle" size={12}/>Suggested groups
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {suggestions.map(sug => (
                <div key={sug.id} className="suggestion fade-in">
                  <div className="ai">✦</div>
                  <div className="copy">
                    <b>{sug.name}</b>
                    <div className="scenes">{sug.reason} · {Math.round(sug.confidence * 100)}% match</div>
                  </div>
                  <button className="btn ghost" onClick={() => dismissSuggestion(sug)}>Dismiss</button>
                  <button className="btn primary" onClick={() => acceptSuggestion(sug)}>
                    <Icon name="check" size={12}/>Create group
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="section-h" style={{margin:"6px 0 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Location groups · {groupsList.length}</span>
            <button className="btn ghost" style={{fontSize:11.5}} onClick={() => promptNewGroup()}><Icon name="plus" size={12}/>New group</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {groupsList.map(g => {
              const eps = [...new Set(g.items.map(i => {
                const ep = window.STORY.EPISODES.find(e => e.id === i.episode);
                return ep?.n;
              }))].sort();
              return (
                <div key={g.name} className="group">
                  <div className="group-head">
                    <Icon name="drag" size={16}/>
                    <div>
                      <div className="name">{g.name}</div>
                      <div className="count">{g.items.length} scenes</div>
                    </div>
                    <div className="ep-list">
                      {!isFilm && `EP ${eps.join(", EP ")}`}
                    </div>
                    <button
                      className="btn ghost"
                      style={{fontSize:11.5,marginLeft:10}}
                      onClick={() => { setShareScope({ type: "group", name: g.name, count: g.items.length }); setShowShare(true); }}
                    >
                      <Icon name="share" size={12}/>Share group
                    </button>
                    <button className="btn ghost" style={{fontSize:11.5,color:"var(--danger)"}} onClick={() => deleteGroup(g.name)}>
                      <Icon name="trash" size={12}/>Delete
                    </button>
                  </div>
                  <div className="group-strip">
                    {g.items.map(s => {
                      const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
                      return (
                        <div className="mini" key={s.id} onClick={() => setOpenScene(s)} style={{cursor:"default"}}>
                          <Placeholder country={ep?.country} hint={s.photoHint} small/>
                          <div className="t">{s.slug}</div>
                          <div className="m">{isFilm ? "" : `EP ${ep?.n} · `}SC {String(s.scene).padStart(2,"0")} · {s.intExt}/{s.dn}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Map view ───────────────────────────────────────────
  function MapView() {
    // Aggregate scenes by city/area
    const locs = useMemo(() => {
      const m = new Map();
      scenes.forEach(s => {
        const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
        // crude city extraction
        const parts = s.address.split(",").map(p => p.trim());
        const city = parts[parts.length - 2] || parts[0];
        const key = `${city}|${ep?.country}`;
        if (!m.has(key)) m.set(key, { city, country: ep?.country, ep, scenes: [] });
        m.get(key).scenes.push(s);
      });
      return [...m.values()];
    }, [scenes]);

    // Hard-coded coordinates (lat, lng) -> normalized SVG positions for our stylized map
    // Map covers roughly western/central europe: lng [-5, 25], lat [40, 55]
    const COORDS = {
      "Le Puy-en-Velay":   [45.04,  3.88, "France"],
      "Saint-Privat-d'Allier": [44.93, 3.66, "France"],
      "Monistrol-d'Allier": [44.96, 3.58, "France"],
      "Conques":           [44.60,  2.40, "France"],
      "Sarajevo":          [43.85, 18.41, "Yugoslavia"],
      "Sarajevo Main Station": [43.86, 18.41, "Yugoslavia"],
      "Sarači":            [43.86, 18.43, "Yugoslavia"],
      "Hrasno block 7":    [43.84, 18.37, "Yugoslavia"],
      "Požega depot":      [43.84, 20.04, "Yugoslavia"],
      "Amsterdam":         [52.37,  4.90, "The Netherlands"],
      "Schluchsee":        [47.81,  8.16, "Germany"],
      "Forsthaus near Schluchsee": [47.83, 8.15, "Germany"],
      "Bahnhof Titisee":   [47.91,  8.15, "Germany"],
      "B500 near Titisee": [47.93,  8.20, "Germany"],
    };
    function projectAddr(addr) {
      for (const k of Object.keys(COORDS)) {
        if (addr.includes(k)) return COORDS[k];
      }
      return null;
    }
    const W = 900, H = 540;
    // lng [-5, 25] → x [60, W-40]
    const xOf = lng => 60 + (lng + 5) / 30 * (W - 100);
    // lat [55, 40] → y [40, H-60]
    const yOf = lat => 40 + (55 - lat) / 15 * (H - 100);

    const pins = scenes.map(s => {
      const c = projectAddr(s.address);
      if (!c) return null;
      return { s, x: xOf(c[1]), y: yOf(c[0]) };
    }).filter(Boolean);

    // bucket by rounded position to avoid overlap
    const bucketed = {};
    pins.forEach(p => {
      const k = `${Math.round(p.x/20)}|${Math.round(p.y/20)}`;
      if (!bucketed[k]) bucketed[k] = { x: p.x, y: p.y, items: [] };
      bucketed[k].items.push(p.s);
    });
    const clusters = Object.values(bucketed);

    return (
      <div className="map-shell">
        <div className="map-side">
          <div className="mh">{clusters.length} locations</div>
          {locs.map((l,i) => (
            <div className="map-loc" key={i}>
              <span className="pin">{l.scenes.length}</span>
              <div style={{flex:1,minWidth:0}}>
                <div className="nm">{l.city}</div>
                <div className="ad">{l.country}{!isFilm ? ` · EP ${l.ep?.n}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="map-canvas">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--line-soft)" strokeWidth="1"/>
              </pattern>
              <pattern id="grid2" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="var(--line)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#grid)"/>
            <rect width={W} height={H} fill="url(#grid2)"/>

            {/* Stylized landmass blobs */}
            <g fill="var(--bg-elev)" stroke="var(--line)" strokeWidth="1.2">
              {/* France */}
              <path d="M 100,200 Q 130,140 200,150 Q 260,160 280,220 Q 290,300 240,340 Q 180,360 130,330 Q 90,290 100,200 Z"/>
              {/* Netherlands / Germany combined blob */}
              <path d="M 320,120 Q 380,90 450,110 Q 510,140 530,200 Q 540,270 500,320 Q 440,360 380,340 Q 320,310 300,250 Q 290,180 320,120 Z"/>
              {/* Yugoslavia */}
              <path d="M 540,260 Q 600,220 680,250 Q 740,290 750,360 Q 720,420 640,420 Q 560,400 540,340 Q 520,290 540,260 Z"/>
            </g>

            {/* Country labels */}
            <g fontFamily="var(--mono)" fontSize="11" fill="var(--ink-3)" letterSpacing="0.06em">
              <text x={xOf(2.5)} y={yOf(46.5)} textAnchor="middle">FRANCE</text>
              <text x={xOf(5.3)} y={yOf(52.2)} textAnchor="middle">NETHERLANDS</text>
              <text x={xOf(10.5)} y={yOf(51)} textAnchor="middle">GERMANY</text>
              <text x={xOf(19)} y={yOf(44.5)} textAnchor="middle">YUGOSLAVIA</text>
            </g>

            {/* Camino route — Le Puy → Conques */}
            <g stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.7">
              <path d={`M ${xOf(3.88)},${yOf(45.04)} Q ${xOf(3.2)},${yOf(44.85)} ${xOf(2.4)},${yOf(44.6)}`}/>
            </g>

            {/* Pins */}
            {clusters.map((c,i) => (
              <g key={i} style={{cursor:"default"}} onClick={() => c.items[0] && setOpenScene(c.items[0])}>
                <circle cx={c.x} cy={c.y + 10} r="4" fill="rgba(0,0,0,0.15)"/>
                <circle cx={c.x} cy={c.y} r="14" fill="var(--accent)" stroke="var(--bg-elev)" strokeWidth="2"/>
                <text x={c.x} y={c.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="var(--mono)">
                  {c.items.length}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  return (
    <div className={"app" + (navOpen ? " nav-open" : "")}>
      <header className="topbar">
        <button className="hamburger-btn" title="Menu" onClick={() => setNavOpen(v => !v)}>
          <Icon name={navOpen ? "close" : "menu"} size={16}/>
        </button>
        <div className="brand">
          <a href="dashboard.html" className="logo" style={{textDecoration:"none"}} title="All projects">
            {(project?.name || "The Camino")[0].toUpperCase()}
          </a>
          <div>
            <div className="title">{project?.name || "The Camino"}</div>
            <div className="sub">{isFilm ? "Feature film" : project ? "Series" : "Season 1 · 4 episodes"}</div>
          </div>
        </div>

        <div className="view-toggle">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
            <Icon name="grid" size={13}/><span className="label-text">Scenes</span>
          </button>
          <button className={view === "groups" ? "active" : ""} onClick={() => setView("groups")}>
            <Icon name="groups" size={13}/><span className="label-text">Groups</span>
            {suggestions.length > 0 && (
              <span style={{
                fontSize:10,padding:"1px 5px",
                borderRadius:8,background:"var(--accent)",color:"white",
                marginLeft:2,
              }}>{suggestions.length}</span>
            )}
          </button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
            <Icon name="map" size={13}/><span className="label-text">Map</span>
          </button>
        </div>

        <div className="search">
          <Icon name="search" size={13}/>
          <input placeholder="Search scenes, locations, addresses…"
                 value={search} onChange={e => setSearch(e.target.value)}/>
          <span className="kbd">⌘K</span>
        </div>

        <div className="spacer"></div>

        <div className="avatar-stack">
          {window.STORY.TEAM.slice(0,4).map(t => (
            <span key={t.id} className="av" style={{background: t.color}}>
              {t.name.split(" ").map(n => n[0]).join("").slice(0,2)}
            </span>
          ))}
        </div>

        <button className="btn" onClick={() => setShowImport(true)}>
          <Icon name="upload" size={13}/><span className="label-text">Import PDF</span>
        </button>
        <div style={{position:"relative"}}>
          <button className="btn" onClick={() => setExportOpen(v => !v)}>
            <Icon name="file" size={13}/><span className="label-text">Export</span>
          </button>
          {exportOpen && (
            <div className="card-menu" style={{top:"calc(100% + 4px)",right:0,left:"auto"}} onMouseLeave={() => setExportOpen(false)}>
              <button onClick={exportPDF}><Icon name="file" size={12}/>Export as PDF</button>
              <button onClick={exportCSV}><Icon name="copy" size={12}/>Export as CSV</button>
            </div>
          )}
        </div>
        <button className="btn primary" onClick={() => setShareScope(null) || setShowShare(true)}>
          <Icon name="share" size={13}/><span className="label-text">Share</span>
        </button>
      </header>

      <Sidebar/>
      <div className="nav-backdrop" onClick={() => setNavOpen(false)}/>

      <main className="main">
        <PageHead/>
        {view === "grid" && <GridView/>}
        {view === "groups" && <GroupsView/>}
        {view === "map" && <MapView/>}
      </main>

      {openScene && (
        <SceneDetail
          scene={openScene}
          groupNames={groupNames}
          isFilm={isFilm}
          onClose={() => setOpenScene(null)}
          onUpdate={patch => updateScene(openScene.id, patch)}
          onAddComment={c => addComment(openScene.id, c)}
          onCreateGroup={name => createGroup(name)}
          onDuplicate={() => { duplicateScene(openScene.id); setOpenScene(null); }}
          onDelete={() => { deleteScene(openScene.id); }}
          onToast={setToast}
        />
      )}
      {showImport && (
        <ImportModal
          isFilm={isFilm}
          onSetProductionType={v => setTweak("productionType", v)}
          onClose={() => setShowImport(false)}
          onImport={importScenes}
        />
      )}
      {showPrint && (
        <PrintModal
          scenes={scenes}
          isFilm={isFilm}
          perPage={printPerPage}
          onSetPerPage={setPrintPerPage}
          computePrintPages={computePrintPages}
          onClose={() => setShowPrint(false)}
          onPrint={() => { setShowPrint(false); setToast("Opening print dialog…"); setTimeout(() => window.print(), 250); }}
        />
      )}
      {showShare && <ShareModal scope={shareScope} scenes={scenes} onClose={() => setShowShare(false)} onToast={setToast}/>}

      {toast && <div className="toast">{toast}</div>}

      <PrintSheets scenes={scenes} isFilm={isFilm} perPage={printPerPage} computePrintPages={computePrintPages}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic"/>
        <TweakRadio label="Production type" value={t.productionType}
          options={[
            { value: "series", label: "Series" },
            { value: "film", label: "Film" },
          ]}
          onChange={v => setTweak("productionType", v)}/>
        <TweakRadio label="Theme" value={t.theme}
          options={[
            { value: "studio", label: "Studio" },
            { value: "cinema", label: "Cinema" },
            { value: "paper",  label: "Paper" },
          ]}
          onChange={v => setTweak("theme", v)}/>
        <TweakColor label="Accent" value={t.accent}
          options={["#9C6A3F", "#3C6EB4", "#2A6F3C", "#7A5AE0", "#C04848"]}
          onChange={v => setTweak("accent", v)}/>
        <TweakSection label="Cards"/>
        <TweakToggle label="Show address on card" value={t.showAddressOnCard}
          onChange={v => setTweak("showAddressOnCard", v)}/>
        <TweakRadio label="Grid density" value={String(t.gridCols)}
          options={[
            { value: "3", label: "Wide" },
            { value: "4", label: "Standard" },
            { value: "5", label: "Compact" },
          ]}
          onChange={v => setTweak("gridCols", Number(v))}/>
        <TweakSection label="Demo"/>
        <TweakButton label="Open import flow" onClick={() => setShowImport(true)}>
          Open import
        </TweakButton>
        <TweakButton label="Open share flow" onClick={() => setShowShare(true)}>
          Open share
        </TweakButton>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
