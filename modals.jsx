// modals.jsx — Scene detail, PDF import flow, Share

const { useState, useEffect, useRef, useMemo } = React;

// ── Scene Detail Modal ─────────────────────────────────────
const MAX_PHOTOS = 3;

// Turns a photo's GPS into a readable address via OpenStreetMap's free
// reverse-geocoding (Nominatim) — no API key/billing account needed, unlike
// Google's Geocoding API. Only ever used to *pre-fill* an empty address, so
// it never overwrites something the user typed in themselves.
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

function SceneDetail({ scene, groupNames = [], isFilm, onClose, onUpdate, onAddComment, onCreateGroup, onDuplicate, onDelete, onToast }) {
  const ep = window.STORY.EPISODES.find(e => e.id === scene.episode);
  const [activePhoto, setActivePhoto] = useState(0);
  const [notes, setNotes] = useState(scene.notes);
  const [slug, setSlug] = useState(scene.slug);
  const [locId, setLocId] = useState(scene.locationId ?? "");
  const [addr, setAddr] = useState(scene.address ?? "");
  const [mapsOverride, setMapsOverride] = useState(scene.mapsOverride ?? "");
  const [sceneNum, setSceneNum] = useState(scene.scene);
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const uploadedPhotos = scene.photos || [];
  // gallery shows real uploaded photos; falls back to a placeholder slot if none yet
  const photos = uploadedPhotos.length ? uploadedPhotos : [scene.photoHint];
  const isUploaded = i => uploadedPhotos.length > 0;

  // Resize client-side, once per upload, into two sizes. These only ever need
  // to look sharp printed on A4 (never full-bleed, always one of several
  // cards on a page) — not archival quality — so both are kept small: a
  // smaller payload uploads and syncs faster, which also narrows the window
  // for the kind of concurrent-edit race that used to lose photos.
  // - "full" (1400px longest edge, q .78) for the detail view / print export
  // - "thumb" (360px longest edge, q .65) for card/row/mini covers, so boards with
  //   many scenes don't decode dozens of full-res images just to show a small crop
  function drawResized(img, maxDim, quality) {
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
      else { width = Math.round(width * maxDim / height); height = maxDim; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = e => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          resolve({
            full: drawResized(img, 1400, 0.78),
            thumb: drawResized(img, 360, 0.65),
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const photoGeo = scene.photoGeo || [];

  async function handleFiles(fileList) {
    const all = [...fileList].filter(f => f.type.startsWith("image/"));
    if (!all.length) return;
    const room = Math.max(0, MAX_PHOTOS - uploadedPhotos.length);
    const files = all.slice(0, room);
    if (!files.length) {
      onToast?.(`Maximum ${MAX_PHOTOS} photos per card`);
      return;
    }
    setUploading(true);
    try {
      // GPS lives in EXIF, which the resize (drawn through a <canvas>) strips —
      // so it has to be read from the original file, before resizeImage runs.
      // Kept per-photo (not one scene-wide field) so the map link can always
      // follow whichever photo is first, even after reordering or removal.
      const [resized, gpsHits] = await Promise.all([
        Promise.all(files.map(f => resizeImage(f))),
        Promise.all(files.map(f => window.extractPhotoGPS?.(f) ?? Promise.resolve(null))),
      ]);
      const next = [...uploadedPhotos, ...resized.map(r => r.full)];
      const nextThumbs = [...(scene.photoThumbs || []), ...resized.map(r => r.thumb)];
      const nextGeo = [...photoGeo, ...gpsHits];
      const patch = { photos: next, photoThumbs: nextThumbs, photoGeo: nextGeo };
      // Pre-fill the address from the photo that's now in slot 0 (same photo
      // that drives the Maps link) — but only if there's nothing there yet,
      // so this never clobbers an address someone already typed in.
      let addressFilled = false;
      if (!scene.address && nextGeo[0]) {
        const found = await reverseGeocode(nextGeo[0].lat, nextGeo[0].lng);
        if (found) { patch.address = found; addressFilled = true; }
      }
      onUpdate(patch);
      setActivePhoto(next.length - resized.length);
      if (all.length > files.length) onToast?.(`Only added ${files.length} — maximum ${MAX_PHOTOS} photos per card`);
      if (addressFilled) onToast?.("📍 Address and Google Maps link filled in from photo location");
      else if (gpsHits.some(Boolean) && !photoGeo.some(Boolean)) onToast?.("📍 Google Maps link updated from photo location");
    } finally {
      setUploading(false);
    }
  }
  function removeActivePhoto() {
    if (!uploadedPhotos.length) return;
    const next = uploadedPhotos.filter((_, i) => i !== activePhoto);
    const nextThumbs = (scene.photoThumbs || []).filter((_, i) => i !== activePhoto);
    const nextGeo = photoGeo.filter((_, i) => i !== activePhoto);
    onUpdate({ photos: next, photoThumbs: nextThumbs, photoGeo: nextGeo });
    setActivePhoto(Math.max(0, activePhoto - 1));
  }
  function movePhoto(from, to) {
    if (to < 0 || to >= uploadedPhotos.length) return;
    const reorder = (arr) => {
      const copy = [...arr];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    };
    onUpdate({
      photos: reorder(uploadedPhotos),
      photoThumbs: reorder(scene.photoThumbs || []),
      photoGeo: reorder(photoGeo),
    });
    if (activePhoto === from) setActivePhoto(to);
  }

  useEffect(() => {
    setSlug(scene.slug); setLocId(scene.locationId ?? ""); setSceneNum(scene.scene); setNotes(scene.notes);
    setAddr(scene.address ?? ""); setMapsOverride(scene.mapsOverride ?? "");
  }, [scene.id]);
  // Picks up the address the moment a photo upload auto-fills it, without
  // needing to close and reopen the modal — but only into an still-empty
  // field, so it can never stomp on an address someone's mid-typing.
  useEffect(() => {
    if (!addr && scene.address) setAddr(scene.address);
  }, [scene.address]);

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

  // Prefer the exact spot the *first* photo was taken (from its EXIF GPS) over
  // the free-text address — reordering or removing photos naturally updates
  // this, since it always reads whichever photo is currently in slot 0.
  const primaryGeo = photoGeo[0] || scene.geo; // scene.geo: back-compat with scenes saved before per-photo GPS
  const mapsQuery = primaryGeo ? `${primaryGeo.lat},${primaryGeo.lng}` : scene.address;
  // A manual override always wins — it can be a plain search query or a full
  // Google Maps URL (pasted straight from the app), since sometimes the
  // photo's GPS or the free-text address isn't quite the exact spot wanted.
  const mapsUrl = scene.mapsOverride
    ? (/^https?:\/\//i.test(scene.mapsOverride) ? scene.mapsOverride : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(scene.mapsOverride))
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapsQuery);

  return (
    <div className="modal-bg" onClick={onClose}>
      <button className="modal-close-mobile" onClick={onClose} title="Close">
        <Icon name="close" size={16}/>
      </button>
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
                <div key={i} className={"t" + (i===activePhoto?" active":"")}
                     draggable={isUploaded(i)}
                     onClick={()=>setActivePhoto(i)}
                     onDragStart={e => { if (isUploaded(i)) e.dataTransfer.setData("text/plain", String(i)); }}
                     onDragOver={e => { if (isUploaded(i)) e.preventDefault(); }}
                     onDrop={e => {
                       if (!isUploaded(i)) return;
                       e.preventDefault();
                       const from = Number(e.dataTransfer.getData("text/plain"));
                       if (!Number.isNaN(from) && from !== i) movePhoto(from, i);
                     }}
                >
                  {isUploaded(i) ? (
                    <>
                      <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      {i === 0 && <span className="t-primary" title="Used for the Google Maps link"><Icon name="pin" size={9}/></span>}
                      {uploadedPhotos.length > 1 && (
                        <div className="t-move">
                          {i > 0 && (
                            <button title="Move earlier" style={{transform:"scaleX(-1)"}} onClick={e => { e.stopPropagation(); movePhoto(i, i - 1); }}>
                              <Icon name="chevR" size={9}/>
                            </button>
                          )}
                          {i < uploadedPhotos.length - 1 && (
                            <button title="Move later" onClick={e => { e.stopPropagation(); movePhoto(i, i + 1); }}>
                              <Icon name="chevR" size={9}/>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <Placeholder country={ep?.country} hint={p} aspect="auto" small/>
                  )}
                </div>
              ))}
              {uploadedPhotos.length < MAX_PHOTOS && (
                <button className="add" title="Add photo" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Icon name="plus" size={14}/>
                </button>
              )}
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
                  type="text"
                  value={sceneNum}
                  onChange={e => setSceneNum(e.target.value)}
                  onBlur={() => onUpdate({ scene: sceneNum.trim() || scene.scene })}
                  style={{
                    width:72,border:"1px solid var(--line)",borderRadius:6,
                    padding:"5px 8px",fontSize:13,fontFamily:"var(--mono)",background:"var(--bg)",
                  }}
                />
              </div>
              <div className="row" style={{marginTop:10,gap:6,alignItems:"center"}}>
                <span style={{fontSize:11.5,color:"var(--ink-3)",fontFamily:"var(--mono)"}}>ID</span>
                <input
                  type="text"
                  value={locId}
                  onChange={e => setLocId(e.target.value)}
                  onBlur={() => onUpdate({ locationId: locId })}
                  placeholder="Location ID"
                  style={{
                    width:100,border:"1px solid var(--line)",borderRadius:6,
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
              <dt>Address</dt><dd>
                <input
                  className="kv-edit"
                  value={addr}
                  onChange={e => setAddr(e.target.value)}
                  onBlur={() => onUpdate({ address: addr })}
                  placeholder="Street, city, country"
                />
              </dd>
              <dt>Google Maps</dt><dd>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    Open in Maps <Icon name="ext" size={11}/>
                  </a>
                  {primaryGeo && !scene.mapsOverride && (
                    <span style={{fontSize:11,color:"var(--ink-3)"}} title={`${primaryGeo.lat.toFixed(5)}, ${primaryGeo.lng.toFixed(5)}`}>
                      📍 from 1st photo
                    </span>
                  )}
                </div>
                <input
                  className="kv-edit"
                  value={mapsOverride}
                  onChange={e => setMapsOverride(e.target.value)}
                  onBlur={() => onUpdate({ mapsOverride: mapsOverride.trim() })}
                  placeholder="Override with a search query or Maps link…"
                />
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
                {scene.comments.map((c,i) => (
                  <div className="comment" key={i}>
                    <Avatar user={c.user} size={26}/>
                    <div className="body">
                      <div className="top">
                        <span className="name">{c.user || "Guest"}</span>
                        <span className="ts">{c.ts} ago</span>
                      </div>
                      <div className="text">{c.text}</div>
                    </div>
                  </div>
                ))}
                <div className="comment-input">
                  <Avatar user={sessionStorage.getItem("sb_user_email")} size={26}/>
                  <input
                    placeholder="Add a comment…"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newComment.trim()) {
                        onAddComment({ user: sessionStorage.getItem("sb_user_email") || "Guest", text: newComment.trim(), ts: "now" });
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
function ShareModal({ scope, scenes = [], isFilm, onClose, onToast }) {
  const [perm, setPerm] = useState("comment");
  const isGroup = scope?.type === "group";
  const projectId = window.STORY.PROJECT?.id;

  // A real, live link — it always resolves against the *current* scenes in
  // Supabase (see get_shared_scenes), so it never goes stale like a snapshot would.
  const [url, setUrl] = useState(null);
  const [urlLoading, setUrlLoading] = useState(true);
  useEffect(() => {
    if (!projectId) { setUrlLoading(false); return; }
    setUrlLoading(true);
    window.SB_DATA.createShare(projectId, {
      scopeType: isGroup ? "group" : "all",
      scopeName: isGroup ? scope.name : null,
      permission: perm,
    }).then(share => {
      setUrl(`${window.location.origin}/share.html?s=${share.id}`);
      setUrlLoading(false);
    }).catch(err => {
      console.error("[ShareModal] createShare", err);
      setUrlLoading(false);
    });
  }, [projectId, isGroup, scope?.name, perm]);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const loadMembers = () => {
    if (!projectId) { setMembersLoading(false); return; }
    window.SB_DATA.listMembers(projectId).then(list => { setMembers(list); setMembersLoading(false); });
  };
  useEffect(loadMembers, [projectId]);

  async function invitePerson() {
    if (!projectId) return;
    const email = window.prompt("Invite by email:");
    if (!email || !email.trim()) return;
    setInviting(true);
    try {
      const projectName = window.STORY.PROJECT?.name || "this storyboard";
      await window.SB_DATA.inviteMember(projectId, email);
      await window.SB_DATA.sendInviteEmail({ projectId, projectName, toEmail: email });
      loadMembers();
      onToast?.(`Invited ${email.trim()}`);
    } catch (err) {
      onToast?.(err.message?.includes("duplicate") ? "That person already has access" : "Couldn't send invite");
    } finally {
      setInviting(false);
    }
  }
  async function removePerson(id) {
    if (!window.confirm("Remove this person's access?")) return;
    await window.SB_DATA.removeMember(id);
    loadMembers();
  }

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
    if (!url) return;
    navigator.clipboard?.writeText(url).catch(()=>{});
    onToast(`Link copied — always shows the current scenes`);
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
                {isGroup ? `${scope.name} · ${scope.count} scene${scope.count>1?"s":""}` : (window.STORY.PROJECT?.name || "The Camino · Season 1")}
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
              <input readOnly value={urlLoading ? "Creating link…" : (url || "Couldn't create link")}/>
              <button onClick={copy} disabled={!url}><Icon name="copy" size={12}/> Copy</button>
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
                      {isFilm ? "" : `EP${ep?.n}·`}SC{s.scene}{s.shootDay ? ` · D${s.shootDay}` : ""}
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
            <div className="section-h" style={{marginBottom:8}}>People with access · {members.length}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {membersLoading && <div style={{fontSize:12,color:"var(--ink-3)"}}>Loading…</div>}
              {!membersLoading && members.length === 0 && (
                <div style={{fontSize:12,color:"var(--ink-3)"}}>Only you have access so far.</div>
              )}
              {members.map(m => (
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{
                    width:28,height:28,borderRadius:"50%",flexShrink:0,
                    background:"var(--bg-sunk)",border:"1px solid var(--line)",
                    display:"inline-flex",alignItems:"center",justifyContent:"center",
                    fontSize:11.5,fontWeight:600,color:"var(--ink-2)",
                  }}>{m.email[0].toUpperCase()}</span>
                  <div style={{flex:1,fontSize:13,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {m.email}
                  </div>
                  <button className="modal-x" title="Remove access" onClick={() => removePerson(m.id)}>
                    <Icon name="close" size={12}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"12px 20px",borderTop:"1px solid var(--line)",
        }}>
          <button className="btn ghost" style={{fontSize:12}} onClick={invitePerson} disabled={inviting}>
            <Icon name="plus" size={13}/> {inviting ? "Inviting…" : "Invite people"}
          </button>
          <button className="btn primary" onClick={onClose}>Done · {pickedCount} scene{pickedCount!==1?"s":""}</button>
        </div>
      </div>
    </div>
  );
}

// ── Export Modal — pick exactly which scenes go into CSV/locations/PDF ────
function ExportModal({ scenes, isFilm, onClose, onExportCSV, onExportLocationsCSV, onExportPDF }) {
  const [picked, setPicked] = useState(() => {
    const o = {};
    scenes.forEach(s => o[s.id] = true);
    return o;
  });
  const pickedCount = Object.values(picked).filter(Boolean).length;
  const selectedScenes = useMemo(() => scenes.filter(s => picked[s.id]), [scenes, picked]);

  function toggleAll(on) {
    const o = {};
    scenes.forEach(s => o[s.id] = on);
    setPicked(o);
  }
  function isolate(matchFn) {
    const o = {};
    scenes.forEach(s => o[s.id] = matchFn(s));
    setPicked(o);
  }

  const countries = useMemo(() => {
    const set = new Set();
    scenes.forEach(s => {
      const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
      if (ep?.country) set.add(ep.country);
    });
    return [...set];
  }, [scenes]);
  const groups = useMemo(() => {
    const set = new Set();
    scenes.forEach(s => { if (s.group) set.add(s.group); });
    return [...set];
  }, [scenes]);

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
              <div style={{fontSize:13,fontWeight:600}}>Export</div>
              <div style={{fontSize:11.5,color:"var(--ink-3)"}}>Choose what to include</div>
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto"}}>
          <div>
            <div className="section-h" style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>Scenes to include · {pickedCount}/{scenes.length}</span>
              <span style={{display:"flex",gap:8}}>
                <button className="btn ghost" style={{fontSize:11,padding:"3px 8px"}} onClick={() => toggleAll(true)}>All</button>
                <button className="btn ghost" style={{fontSize:11,padding:"3px 8px"}} onClick={() => toggleAll(false)}>None</button>
              </span>
            </div>

            {(countries.length > 1 || groups.length > 0) && (
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {countries.map(c => (
                  <button key={"c-"+c} className="chip" style={{fontSize:11.5}}
                    onClick={() => isolate(s => window.STORY.EPISODES.find(e => e.id === s.episode)?.country === c)}
                  >{c}</button>
                ))}
                {groups.map(g => (
                  <button key={"g-"+g} className="chip" style={{fontSize:11.5}}
                    onClick={() => isolate(s => s.group === g)}
                  >{g}</button>
                ))}
              </div>
            )}

            <div style={{
              border:"1px solid var(--line)",borderRadius:8,
              maxHeight:240,overflowY:"auto",background:"var(--bg-elev)",
            }}>
              {scenes.map(s => {
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
                      {isFilm ? "" : `EP${ep?.n}·`}SC{s.scene}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap",
          padding:"12px 20px",borderTop:"1px solid var(--line)",
        }}>
          <button className="btn ghost" onClick={() => onExportLocationsCSV(selectedScenes)} disabled={!pickedCount}>
            <Icon name="pin" size={12}/>Locations CSV
          </button>
          <button className="btn ghost" onClick={() => onExportCSV(selectedScenes)} disabled={!pickedCount}>
            <Icon name="copy" size={12}/>Scenes CSV
          </button>
          <button className="btn primary" onClick={() => onExportPDF(selectedScenes)} disabled={!pickedCount}>
            <Icon name="file" size={13}/>PDF · {pickedCount} scene{pickedCount!==1?"s":""}
          </button>
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
              <div style={{fontSize:11.5,color:"var(--ink-3)"}}>
                {scenes.length} scenes · A4 {Number(resolvedPerPage) === 2 ? "landscape" : "portrait"}
              </div>
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
                { v: "2", label: "2 · Landscape" },
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

Object.assign(window, { SceneDetail, ImportModal, ShareModal, PrintModal, ExportModal });
