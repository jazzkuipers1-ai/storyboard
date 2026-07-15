// modals.jsx — Scene detail, PDF import flow, Share

const { useState, useEffect, useRef, useMemo } = React;

// ── Scene Detail Modal ─────────────────────────────────────
function SceneDetail({ scene, groupNames = [], isFilm, onClose, onUpdate, onAddComment, onCreateGroup, onDuplicate, onDelete }) {
  const ep = window.STORY.EPISODES.find(e => e.id === scene.episode);
  const [activePhoto, setActivePhoto] = useState(0);
  const [notes, setNotes] = useState(scene.notes);
  const [slug, setSlug] = useState(scene.slug);
  const [sceneNum, setSceneNum] = useState(scene.scene);
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const uploadedPhotos = scene.photos || [];
  // gallery shows real uploaded photos; falls back to a placeholder slot if none yet
  const photos = uploadedPhotos.length ? uploadedPhotos : [scene.photoHint];
  const isUploaded = i => uploadedPhotos.length > 0;

  // Resize client-side so files stay small but print crisp on A4 (~2000px longest edge ≈ 240dpi at full page)
  function resizeImage(file, maxDim = 2000, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = e => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    try {
      const resized = await Promise.all(files.map(f => resizeImage(f)));
      const next = [...uploadedPhotos, ...resized];
      onUpdate({ photos: next });
      setActivePhoto(next.length - resized.length);
    } finally {
      setUploading(false);
    }
  }
  function removeActivePhoto() {
    if (!uploadedPhotos.length) return;
    const next = uploadedPhotos.filter((_, i) => i !== activePhoto);
    onUpdate({ photos: next });
    setActivePhoto(Math.max(0, activePhoto - 1));
  }

  useEffect(() => { setSlug(scene.slug); setSceneNum(scene.scene); setNotes(scene.notes); }, [scene.id]);

  function handleGroupPick(val) {
    if (val === "__new__") {
      const name = window.prompt("New location group name:");
      if (!name || !name.trim()) return;
      const clean = onCreateGroup(name);
      if (clean) onUpdate({ group: clean });
      return;
    }
    onUpdate({ group: val || null });
  }

  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(scene.address);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="scene-detail">
          <div className="gallery">
            <div className="hero">
              {isUploaded(activePhoto) ? (
                <img src={photos[activePhoto]} alt={scene.slug} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              ) : (
                <Placeholder country={ep?.country} hint={photos[activePhoto]} aspect="auto"/>
              )}
              <div style={{position:"absolute",top:12,left:12,display:"flex",gap:6}}>
                <span className={`tag ${tagCls(scene.intExt)}`}>{scene.intExt}</span>
                <span className={`tag ${tagCls(scene.dn)}`}>{scene.dn}</span>
              </div>
              {isUploaded(activePhoto) && (
                <button className="photo-remove" title="Remove photo" onClick={removeActivePhoto}>
                  <Icon name="trash" size={13}/>
                </button>
              )}
              {uploading && (
                <div className="photo-uploading">
                  <div className="spin" style={{width:20,height:20,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%"}}/>
                  Optimizing for print…
                </div>
              )}
            </div>
            <div className="thumbs">
              {photos.map((p,i) => (
                <div key={i} className={"t" + (i===activePhoto?" active":"")} onClick={()=>setActivePhoto(i)}>
                  {isUploaded(i) ? (
                    <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  ) : (
                    <Placeholder country={ep?.country} hint={p} aspect="auto" small/>
                  )}
                </div>
              ))}
              <button className="add" title="Add photo" onClick={() => fileInputRef.current?.click()}>
                <Icon name="plus" size={14}/>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{display:"none"}}
                onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          <div className="info">
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div className="crumbs" style={{margin:0}}>
                  {!isFilm && <><span>EP {ep?.n} · {ep?.title}</span><span className="sep">/</span></>}
                  <span>Scene {String(scene.scene).padStart(2,"0")}</span>
                </div>
                <button className="modal-x" onClick={onClose}><Icon name="close" size={14}/></button>
              </div>
              <div className="row" style={{marginTop:10,gap:8,alignItems:"center"}}>
                <span style={{fontSize:11.5,color:"var(--ink-3)",fontFamily:"var(--mono)"}}>SC</span>
                <input
                  type="number"
                  value={sceneNum}
                  onChange={e => setSceneNum(e.target.value)}
                  onBlur={() => onUpdate({ scene: Number(sceneNum) || scene.scene })}
                  style={{
                    width:56,border:"1px solid var(--line)",borderRadius:6,
                    padding:"5px 8px",fontSize:13,fontFamily:"var(--mono)",background:"var(--bg)",
                  }}
                />
              </div>
              <input
                className="slug-edit"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                onBlur={() => onUpdate({ slug })}
                placeholder="Location name / slugline"
              />
              <div className="row" style={{marginTop:6,gap:8}}>
                <button className="btn ghost" style={{fontSize:12}} onClick={onDuplicate}>
                  <Icon name="copy" size={12}/>Duplicate
                </button>
                <button className="btn ghost" style={{fontSize:12,color:"var(--danger)"}} onClick={onDelete}>
                  <Icon name="trash" size={12}/>Delete
                </button>
              </div>
              <div className="row" style={{marginTop:10}}>
                <StatusBadge status={scene.status}/>
                <select
                  value={scene.status}
                  onChange={e => onUpdate({ status: e.target.value })}
                  style={{
                    marginLeft:"auto",
                    border:"1px solid var(--line)",
                    background:"var(--bg-elev)",
                    borderRadius:6,
                    padding:"4px 8px",
                    fontSize:12,
                  }}
                >
                  {Object.entries(STATUS).map(([k,v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <dl className="kv">
              {!isFilm && <><dt>Episode</dt><dd>{ep?.n} · {ep?.title} <span style={{color:"var(--ink-3)"}}>· {ep?.era}</span></dd></>}
              <dt>Country</dt><dd style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="flag" style={{width:18,height:12,display:"inline-block",borderRadius:2,overflow:"hidden"}}>{ep?.flag}</span>
                {ep?.country}
              </dd>
              <dt>Address</dt><dd>{scene.address}</dd>
              <dt>Google Maps</dt><dd>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  Open in Maps <Icon name="ext" size={11}/>
                </a>
              </dd>
            </dl>

            <div>
              <div className="section-h">Location group</div>
              <div className="group-tabs">
                <button
                  className={"grp-tab" + (!scene.group ? " active" : "")}
                  onClick={() => handleGroupPick(null)}
                >No group</button>
                {groupNames.map(g => (
                  <button
                    key={g}
                    className={"grp-tab" + (scene.group === g ? " active" : "")}
                    onClick={() => handleGroupPick(g)}
                  >{g}</button>
                ))}
                <button className="grp-tab new" onClick={() => handleGroupPick("__new__")}>
                  <Icon name="plus" size={11}/>New group
                </button>
              </div>
            </div>

            <div>
              <div className="section-h">Notes</div>
              <textarea
                className="notes-area"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => onUpdate({ notes })}
                placeholder="Add scouting notes, lighting, access, parking…"
              />
            </div>

            <div>
              <div className="section-h">Comments · {scene.comments.length}</div>
              <div className="comments">
                {scene.comments.map((c,i) => {
                  const t = window.STORY.TEAM.find(x => x.id === c.user);
                  return (
                    <div className="comment" key={i}>
                      <Avatar user={c.user} size={26}/>
                      <div className="body">
                        <div className="top">
                          <span className="name">{t?.name || "Guest"}</span>
                          <span className="ts">{c.ts} ago</span>
                        </div>
                        <div className="text">{c.text}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="comment-input">
                  <Avatar user="mw" size={26}/>
                  <input
                    placeholder="Add a comment…"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newComment.trim()) {
                        onAddComment({ user: "mw", text: newComment.trim(), ts: "now" });
                        setNewComment("");
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PDF Import Modal ───────────────────────────────────────
function ImportModal({ isFilm, onSetProductionType, onClose, onImport }) {
  const [stage, setStage] = useState("drop"); // drop | parsing | preview | error
  const [over, setOver] = useState(false);
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState([]);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // demo fallback — used only via the explicit "sample" link, not real imports
  const SAMPLE_PARSE = [
    { tmpId:"p1", episode:"ep4", scene:7,  intExt:"INT", dn:"NIGHT", slug:"GASTHAUS HIRSCH — DINING ROOM",       address:"Hauptstraße 14, Schluchsee, Germany",            country:"Germany" },
    { tmpId:"p2", episode:"ep4", scene:8,  intExt:"EXT", dn:"DAY",   slug:"BAHNHOFSPLATZ — TITISEE",              address:"Bahnhof Titisee, Germany",                       country:"Germany" },
    { tmpId:"p3", episode:"ep4", scene:9,  intExt:"INT", dn:"DAY",   slug:"GASTHAUS HIRSCH — KITCHEN",            address:"Hauptstraße 14, Schluchsee, Germany",            country:"Germany" },
    { tmpId:"p4", episode:"ep1", scene:10, intExt:"EXT", dn:"DAY",   slug:"CONQUES — STREET MARKET",              address:"Rue Charlemagne, Conques, France",               country:"France" },
    { tmpId:"p5", episode:"ep1", scene:11, intExt:"INT", dn:"NIGHT", slug:"AUBERGE SAINTE-FOY — BAR",             address:"Rue Principale, Conques, France",                country:"France" },
    { tmpId:"p6", episode:"ep2", scene:7,  intExt:"EXT", dn:"NIGHT", slug:"OLD CITY — ALLEYWAY",                  address:"Sarači, Sarajevo (period dress)",                country:"Yugoslavia" },
    { tmpId:"p7", episode:"ep3", scene:7,  intExt:"INT", dn:"DAY",   slug:"CENTRAAL STATION — PLATFORM 2A",       address:"Stationsplein 1, Amsterdam",                     country:"The Netherlands" },
  ];

  function finishParse(list) {
    setParsed(list);
    const sel = {};
    list.forEach(p => sel[p.tmpId] = true);
    setSelected(sel);
    setStage("preview");
  }

  function useSample() {
    setFilename("Camino_S1_Schedule_v4.pdf (sample)");
    setStage("parsing");
    setTimeout(() => finishParse(SAMPLE_PARSE), 900);
  }

  async function parseFile(file) {
    setFilename(file.name);
    setError("");
    setStage("parsing");
    try {
      const scenes = await window.parseChronoPdf(file);
      if (!scenes.length) {
        setError(`No scenes recognized in "${file.name}". This importer expects a "Chrono Script Order" export.`);
        setStage("error");
        return;
      }
      finishParse(scenes);
    } catch (err) {
      console.error(err);
      setError(`Couldn't read "${file.name}": ${err.message || err}`);
      setStage("error");
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }

  function onPick(e) {
    const f = e.target.files[0];
    if (f) parseFile(f);
    e.target.value = "";
  }

  function confirm() {
    const toImport = parsed.filter(p => selected[p.tmpId]);
    onImport(toImport);
    onClose();
  }

  const wide = stage === "preview";
  const stats = useMemo(() => {
    const list = parsed.filter(p => selected[p.tmpId]);
    const slugRoot = s => (s || "").split("—")[0].trim();
    const buckets = {};
    list.forEach(p => { const k = slugRoot(p.slug); if (k) (buckets[k] = buckets[k] || []).push(p); });
    const groupCount = Object.values(buckets).filter(g => g.length >= 2).length;
    return {
      total: list.length,
      int: list.filter(p => p.intExt === "INT").length,
      ext: list.filter(p => p.intExt === "EXT").length,
      inte: list.filter(p => p.intExt === "I+E").length,
      eps: [...new Set(list.map(p => p.episode))].length,
      groupCount,
    };
  }, [parsed, selected]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={"modal" + (wide ? "" : " narrow")} onClick={e=>e.stopPropagation()}
           style={{flexDirection:"column"}}>
        <div className="modal-head">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{
              width:28,height:28,borderRadius:7,
              background:"var(--bg-sunk)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
            }}>
              <Icon name="upload" size={15}/>
            </span>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Import scenes from PDF</div>
              <div style={{fontSize:11.5,color:"var(--ink-3)"}}>
                {stage === "drop" && "Drop a Chrono Script Order or Fuzzlecheck PDF"}
                {stage === "parsing" && `Reading ${filename}…`}
                {stage === "preview" && `${parsed.length} scenes found in ${filename}`}
                {stage === "error" && `Couldn't parse ${filename}`}
              </div>
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div style={{padding:"18px 20px",overflowY:"auto"}}>
          {stage === "drop" && (
            <div
              className={"dropzone" + (over ? " over" : "")}
              onDragOver={e => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf" style={{display:"none"}} onChange={onPick}/>
              <div className="icon"><Icon name="file" size={22}/></div>
              <h3>Drop a schedule PDF here</h3>
              <p>Chrono Script Order exports are parsed for real — click to browse, or <a href="#" style={{color:"var(--accent)"}} onClick={e => { e.stopPropagation(); e.preventDefault(); useSample(); }}>use the sample</a> instead.</p>
              <p style={{marginTop:10}}>
                We'll detect <b style={{color:"var(--ink-2)"}}>INT/EXT</b>, <b style={{color:"var(--ink-2)"}}>Day/Night</b>, <b style={{color:"var(--ink-2)"}}>Scene #</b>, <b style={{color:"var(--ink-2)"}}>Country</b> and <b style={{color:"var(--ink-2)"}}>Location</b>.
              </p>
              <div className="examples">
                <span className="ex">INT.</span>
                <span className="ex">EXT.</span>
                <span className="ex">DAY</span>
                <span className="ex">NIGHT</span>
                <span className="ex">1.01</span>
                <span className="ex">2.34p1</span>
              </div>
            </div>
          )}

          {stage === "parsing" && (
            <div style={{padding:"40px 20px",textAlign:"center"}}>
              <div className="spin" style={{
                width:36,height:36,border:"2.5px solid var(--bg-sunk)",
                borderTopColor:"var(--ink)",borderRadius:"50%",
                margin:"0 auto 14px",
              }}/>
              <div style={{fontFamily:"var(--serif)",fontSize:20,marginBottom:4}}>Parsing schedule…</div>
              <div style={{color:"var(--ink-3)",fontSize:12.5}}>Detecting scene slugs, episode markers and locations</div>
            </div>
          )}

          {stage === "error" && (
            <div style={{padding:"30px 20px",textAlign:"center"}}>
              <div style={{
                width:36,height:36,borderRadius:"50%",margin:"0 auto 14px",
                background:"color-mix(in oklch, var(--danger) 14%, transparent)",
                display:"flex",alignItems:"center",justifyContent:"center",color:"var(--danger)",
              }}><Icon name="close" size={16}/></div>
              <div style={{fontFamily:"var(--serif)",fontSize:20,marginBottom:6}}>Couldn't parse that file</div>
              <div style={{color:"var(--ink-3)",fontSize:12.5,maxWidth:380,margin:"0 auto"}}>{error}</div>
              <button className="btn ghost" style={{marginTop:16}} onClick={() => setStage("drop")}>Try another file</button>
            </div>
          )}

          {stage === "preview" && (
            <div>
              {stats.eps <= 1 && !isFilm && (
                <div className="suggestion" style={{marginBottom:14}}>
                  <div className="ai">✦</div>
                  <div className="copy">
                    <b>This looks like a single film, not a series</b>
                    <div className="scenes">All parsed scenes belong to one episode marker — switch project type to Film?</div>
                  </div>
                  <button className="btn primary" onClick={() => onSetProductionType("film")}>
                    <Icon name="check" size={12}/>Switch to Film
                  </button>
                </div>
              )}
              <div style={{
                border:"1px solid var(--line)",
                borderRadius:8,
                overflow:"hidden",
                background:"var(--bg-elev)",
              }}>
                <div className="parse-row head">
                  <div></div>
                  <div>EP · SC</div>
                  <div>TYPE</div>
                  <div>SLUG / ADDRESS</div>
                  <div>COUNTRY</div>
                  <div></div>
                </div>
                {parsed.map(p => {
                  const ep = window.STORY.EPISODES.find(e => e.id === p.episode);
                  return (
                    <div className="parse-row" key={p.tmpId}>
                      <input type="checkbox" className="toggle"
                             checked={!!selected[p.tmpId]}
                             onChange={e => setSelected({ ...selected, [p.tmpId]: e.target.checked })}/>
                      <div className="ep">{ep?.n}·{String(p.scene).padStart(2,"0")}</div>
                      <div style={{display:"flex",gap:4}}>
                        <span className={`tag ${tagCls(p.intExt)}`}>{p.intExt}</span>
                        <span className={`tag ${tagCls(p.dn)}`}>{p.dn}</span>
                      </div>
                      <div>
                        <div style={{fontWeight:500}}>{p.slug}</div>
                        <div style={{color:"var(--ink-3)",fontSize:11.5}}>{p.address}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
                        <span style={{width:14,height:10,display:"inline-block",borderRadius:2,overflow:"hidden",border:"0.5px solid var(--line)"}}>
                          {ep?.flag}
                        </span>
                        {p.country}
                      </div>
                      <button className="modal-x" title="Edit"><Icon name="edit" size={13}/></button>
                    </div>
                  );
                })}
              </div>
              <div className="parse-summary">
                <Icon name="sparkle" size={16}/>
                <div style={{flex:1}}>
                  <b style={{color:"var(--ink)"}}>{stats.total} scenes</b> ready to import — {stats.int} interior, {stats.ext} exterior{stats.inte ? `, ${stats.inte} both` : ""}, across {stats.eps} {isFilm ? "countries" : "episodes"}.
                  {stats.groupCount > 0 && <> We'll also suggest <b style={{color:"var(--ink)"}}>{stats.groupCount} new location group{stats.groupCount !== 1 ? "s" : ""}</b> after import.</>}
                </div>
              </div>
            </div>
          )}
        </div>

        {stage === "preview" && (
          <div style={{
            display:"flex",justifyContent:"flex-end",gap:8,
            padding:"12px 20px",borderTop:"1px solid var(--line)",
          }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={confirm}>
              <Icon name="check" size={13}/>Import {stats.total} scenes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Share Modal ────────────────────────────────────────────
function ShareModal({ scope, scenes = [], onClose, onToast }) {
  const [perm, setPerm] = useState("comment");
  const isGroup = scope?.type === "group";
  const slug = isGroup ? scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "camino-s1";
  const url = `https://storyboard.app/p/${slug}-9f3a7c`;

  const candidates = useMemo(() => {
    const list = isGroup ? scenes.filter(s => s.group === scope.name) : scenes;
    return [...list].sort((a,b) => (a.shootIndex ?? 999) - (b.shootIndex ?? 999));
  }, [scenes, scope]);

  const [picked, setPicked] = useState(() => {
    const o = {};
    candidates.forEach(s => o[s.id] = true);
    return o;
  });
  const pickedCount = Object.values(picked).filter(Boolean).length;
  function toggleAll(on) {
    const o = {};
    candidates.forEach(s => o[s.id] = on);
    setPicked(o);
  }

  function copy() {
    navigator.clipboard?.writeText(url).catch(()=>{});
    onToast(`Link copied — ${pickedCount} scene${pickedCount!==1?"s":""} shared, comments allowed`);
  }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal narrow" onClick={e => e.stopPropagation()} style={{flexDirection:"column"}}>
        <div className="modal-head">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{
              width:28,height:28,borderRadius:7,
              background:"var(--bg-sunk)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
            }}><Icon name="share" size={14}/></span>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{isGroup ? `Share group` : "Share storyboard"}</div>
              <div style={{fontSize:11.5,color:"var(--ink-3)"}}>
                {isGroup ? `${scope.name} · ${scope.count} scene${scope.count>1?"s":""}` : "The Camino · Season 1"}
              </div>
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
          {isGroup && (
            <div className="parse-summary" style={{marginTop:0}}>
              <Icon name="groups" size={15}/>
              <div>Recipients will only see the <b style={{color:"var(--ink)"}}>{scope.count}</b> scene{scope.count>1?"s":""} in <b style={{color:"var(--ink)"}}>{scope.name}</b> — not the full storyboard.</div>
            </div>
          )}
          <div>
            <div className="section-h" style={{marginBottom:6}}>{isGroup ? "Group link" : "Public link"}</div>
            <div className="share-link">
              <input readOnly value={url}/>
              <button onClick={copy}><Icon name="copy" size={12}/> Copy</button>
            </div>
          </div>

          <div>
            <div className="section-h" style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>Scenes to include · {pickedCount}/{candidates.length}</span>
              <span style={{display:"flex",gap:8}}>
                <button className="btn ghost" style={{fontSize:11,padding:"3px 8px"}} onClick={() => toggleAll(true)}>All</button>
                <button className="btn ghost" style={{fontSize:11,padding:"3px 8px"}} onClick={() => toggleAll(false)}>None</button>
              </span>
            </div>
            <div style={{
              border:"1px solid var(--line)",borderRadius:8,
              maxHeight:220,overflowY:"auto",background:"var(--bg-elev)",
            }}>
              {candidates.map(s => {
                const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
                return (
                  <label key={s.id} style={{
                    display:"flex",alignItems:"center",gap:9,
                    padding:"7px 10px",borderBottom:"1px solid var(--line-soft)",
                    fontSize:12.5,cursor:"default",
                  }}>
                    <input type="checkbox" className="toggle"
                           checked={!!picked[s.id]}
                           onChange={e => setPicked({ ...picked, [s.id]: e.target.checked })}/>
                    <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {s.slug}
                    </span>
                    <span style={{color:"var(--ink-3)",fontFamily:"var(--mono)",fontSize:11,flexShrink:0}}>
                      EP{ep?.n}·SC{s.scene}{s.shootDay ? ` · D${s.shootDay}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="share-perm">
            <div className="l">
              Anyone with the link
              <small>{perm === "view" ? "Can view scenes, groups and the map" : "Can view and leave comments on scenes"}</small>
            </div>
            <select value={perm} onChange={e => setPerm(e.target.value)}>
              <option value="view">Can view</option>
              <option value="comment">Can comment</option>
            </select>
          </div>
          <div>
            <div className="section-h" style={{marginBottom:8}}>People with access · {window.STORY.TEAM.length}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {window.STORY.TEAM.map(t => (
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar user={t.id} size={28}/>
                  <div style={{flex:1,fontSize:13}}>
                    {t.name}
                    <div style={{fontSize:11,color:"var(--ink-3)"}}>{t.role}</div>
                  </div>
                  <span style={{fontSize:12,color:"var(--ink-3)"}}>Editor</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"12px 20px",borderTop:"1px solid var(--line)",
        }}>
          <button className="btn ghost" style={{fontSize:12}}>
            <Icon name="plus" size={13}/> Invite people
          </button>
          <button className="btn primary" onClick={onClose}>Done · {pickedCount} scene{pickedCount!==1?"s":""}</button>
        </div>
      </div>
    </div>
  );
}

// ── Print / PDF Modal ──────────────────────────────────────
function PrintModal({ scenes, isFilm, perPage, onSetPerPage, computePrintPages, onClose, onPrint }) {
  const { pages, perPage: resolvedPerPage } = computePrintPages(scenes, perPage);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal narrow" onClick={e => e.stopPropagation()} style={{flexDirection:"column"}}>
        <div className="modal-head">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{
              width:28,height:28,borderRadius:7,
              background:"var(--bg-sunk)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
            }}><Icon name="file" size={14}/></span>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Print storyboard</div>
              <div style={{fontSize:11.5,color:"var(--ink-3)"}}>{scenes.length} scenes · A4 portrait</div>
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div className="section-h" style={{marginBottom:8}}>Cards per page</div>
            <div className="type-pick-row">
              {[
                { v: "smart", label: "Smart" },
                { v: "4", label: "4 · Large" },
                { v: "6", label: "6 · Standard" },
                { v: "9", label: "9 · Compact" },
              ].map(opt => (
                <button
                  key={opt.v}
                  className={"chip" + (perPage === opt.v ? " active" : "")}
                  onClick={() => onSetPerPage(opt.v)}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="suggestion" style={{alignItems:"flex-start"}}>
            <div className="ai">✦</div>
            <div className="copy">
              <b>Suggested layout</b>
              <div className="scenes">
                {perPage === "smart"
                  ? `Auto-picked ${resolvedPerPage} cards/page for ${scenes.length} scenes. `
                  : ""}
                Location groups are kept together on the same page wherever they fit.
              </div>
            </div>
          </div>

          <div>
            <div className="section-h" style={{marginBottom:8}}>{pages.length} page{pages.length>1?"s":""}</div>
            <div style={{
              border:"1px solid var(--line)", borderRadius:8, overflow:"hidden", maxHeight:220, overflowY:"auto",
            }}>
              {pages.map((page, i) => {
                const groups = [...new Set(page.map(p => p.group))];
                const label = groups.length === 1 && groups[0] ? groups[0] : "Mixed scenes";
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"8px 12px", fontSize:12.5,
                    borderBottom: i < pages.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}>
                    <span style={{
                      fontFamily:"var(--mono)", fontSize:11, color:"var(--ink-3)",
                      width:44, flexShrink:0,
                    }}>PG {i+1}</span>
                    <span style={{fontWeight:500, flex:1}}>{label}</span>
                    <span style={{color:"var(--ink-3)", fontSize:11.5}}>{page.length} scene{page.length>1?"s":""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          display:"flex",justifyContent:"flex-end",gap:8,
          padding:"12px 20px",borderTop:"1px solid var(--line)",
        }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={onPrint}>
            <Icon name="file" size={13}/>Print {pages.length} page{pages.length>1?"s":""}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SceneDetail, ImportModal, ShareModal, PrintModal });
