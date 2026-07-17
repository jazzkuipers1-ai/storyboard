// components.jsx — shared UI: icons, cards, placeholders, sidebar bits
const { useState, useEffect } = React;

// CSS class for a tag value ("I+E" isn't a valid class token as-is)
function tagCls(v) { return v === "I+E" ? "inte" : v.toLowerCase(); }

// Small pre-generated cover for cards/rows/mini-thumbs — avoids decoding full-res
// photos just to paint a tiny crop when many scenes are visible at once.
function coverPhoto(scene) { return (scene.photoThumbs && scene.photoThumbs[0]) || (scene.photos && scene.photos[0]); }


// ── Icons (single-stroke, 16px) ────────────────────────────
function Icon({ name, size=16 }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    map:    <><polygon points="3,7 9,4 15,7 21,4 21,17 15,20 9,17 3,20"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="7" x2="15" y2="20"/></>,
    groups: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="18" height="8" rx="1.5"/></>,
    search: <><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>,
    plus:   <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    upload: <><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></>,
    share:  <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.5" y1="10.5" x2="15.5" y2="6.5"/><line x1="8.5" y1="13.5" x2="15.5" y2="17.5"/></>,
    close:  <><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></>,
    menu:   <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>,
    chevR:  <polyline points="9,6 15,12 9,18"/>,
    pin:    <><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
    comment:<><path d="M21 12a8.5 8.5 0 1 1-3.6-6.95L21 4l-1 4a8.4 8.4 0 0 1 1 4z"/></>,
    sparkle:<><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 17l.6 1.6L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.4z"/></>,
    check:  <polyline points="4,12 10,18 20,6"/>,
    copy:   <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
    sun:    <><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.6" y1="4.6" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19.4" y2="19.4"/><line x1="4.6" y1="19.4" x2="6.8" y2="17.2"/><line x1="17.2" y1="6.8" x2="19.4" y2="4.6"/></>,
    moon:   <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>,
    file:   <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14,3 14,8 19,8"/></>,
    drag:   <><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>,
    ext:    <><polyline points="14,4 20,4 20,10"/><line x1="20" y1="4" x2="12" y2="12"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>,
    eye:    <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    edit:   <><path d="M4 20h4l10-10-4-4L4 16z"/><line x1="14" y1="6" x2="18" y2="10"/></>,
    trash:  <><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
}

// ── Status helpers ─────────────────────────────────────────
const STATUS = {
  todo:    { label: "To scout" },
  scouted: { label: "Scouted" },
  locked:  { label: "Locked" },
  shot:    { label: "Shot" },
};

// ── Placeholder image (no SVG art — striped + label) ───────
function Placeholder({ country, hint, aspect="4 / 3", small=false }) {
  const colors = window.STORY.PH[country] || ["oklch(0.85 0.03 80)", "oklch(0.78 0.03 80)"];
  const style = {
    "--ph-c1": colors[0],
    "--ph-c2": colors[1],
    aspectRatio: aspect,
  };
  if (small) return <div className="ph-small" style={style}></div>;
  return (
    <div className="ph-stripe" style={style}>
      <span className="lbl">{hint || "PHOTO"}</span>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`status ${status}`}>
      <span className="dot"></span>{STATUS[status]?.label || status}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────
// Derived straight from a real email/name — there's no separate team roster,
// so anyone with project access shows up correctly without being registered anywhere.
function Avatar({ user, size=24 }) {
  const label = user || "";
  const initials = (label.split("@")[0].match(/[a-z0-9]+/gi) || [])
    .map(s => s[0]).join("").slice(0, 2).toUpperCase() || "?";
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <span className="av" style={{
      width: size, height: size,
      background: `hsl(${hue}, 45%, 55%)`,
      fontSize: size * 0.42,
    }}>{initials}</span>
  );
}

// ── Scene card (for grid) ──────────────────────────────────
function SceneCard({ scene, onOpen, onUpdate, showGroup, isFilm, draggable, onDragStart, onDragOver, onDrop, onDragEnd, dragOver, onDuplicate, onDelete, size }) {
  const ep = window.STORY.EPISODES.find(e => e.id === scene.episode);
  const [menuOpen, setMenuOpen] = useState(false);
  const [num, setNum] = useState(scene.scene);
  const [locId, setLocId] = useState(scene.locationId ?? "");
  const [loc, setLoc] = useState(scene.slug);
  const [addr, setAddr] = useState(scene.address);
  const [desc, setDesc] = useState(scene.notes);
  const [info, setInfo] = useState(scene.sceneInfo ?? "");
  const [scriptDay, setScriptDay] = useState(scene.shootDay ?? "");
  useEffect(() => { setNum(scene.scene); setLocId(scene.locationId ?? ""); setLoc(scene.slug); setAddr(scene.address); setDesc(scene.notes); setInfo(scene.sceneInfo ?? ""); setScriptDay(scene.shootDay ?? ""); }, [scene.id]);

  // Cycle through this card's photos right here on the board — opening the
  // full detail view just to see the 2nd/3rd shot of a location was the
  // complaint this fixes. Thumbs, not full photos: this can be dozens of
  // cards on screen at once.
  const cardPhotos = scene.photoThumbs?.length ? scene.photoThumbs : (scene.photos || []);
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [scene.id]);
  const clampedIdx = Math.min(photoIdx, Math.max(0, cardPhotos.length - 1));

  const stop = e => e.stopPropagation();

  return (
    <div
      className={"card fade-in" + (dragOver ? " drag-over" : "") + (size === "lg" ? " card-lg" : "") + (!scene.group ? " card-nogroup" : "")}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="card-titlebar">
        {draggable ? <span className="drag-handle" title="Drag to reorder"><Icon name="drag" size={13}/></span> : null}
        {!isFilm && <span className="tb-ep">EP {ep?.n}</span>}
        <span className="tb-sc-lbl">SC</span>
        <input
          className="tb-sc-input"
          value={num}
          onClick={stop}
          onChange={e => setNum(e.target.value)}
          onBlur={() => onUpdate({ scene: num.trim() || scene.scene })}
        />
        <div className="tb-title-row">
          <input
            className="tb-locid"
            value={locId}
            placeholder="ID"
            title="Location ID"
            onClick={stop}
            onChange={e => setLocId(e.target.value)}
            onBlur={() => onUpdate({ locationId: locId })}
          />
          <input
            className="tb-loc"
            value={loc}
            onClick={stop}
            onChange={e => setLoc(e.target.value)}
            onBlur={() => onUpdate({ slug: loc })}
          />
        </div>
        <button className="card-expand-btn" title="Open full details" onClick={onOpen}><Icon name="eye" size={12}/></button>
        <button
          className="card-menu-btn"
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        ><Icon name="edit" size={12}/></button>
        {menuOpen && (
          <div className="card-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onOpen(); }}><Icon name="edit" size={12}/>Full details</button>
            <button onClick={() => { setMenuOpen(false); onDuplicate?.(); }}><Icon name="copy" size={12}/>Duplicate</button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDelete?.(); }}><Icon name="trash" size={12}/>Delete</button>
          </div>
        )}
      </div>
      <div className="img" onClick={onOpen}>
        {cardPhotos.length ? (
          <img src={cardPhotos[clampedIdx]} alt={scene.slug}
               style={{width:"100%",aspectRatio:"16 / 9",objectFit:"cover",display:"block"}}/>
        ) : (
          <Placeholder country={scene.country} hint={scene.photoHint} aspect="16 / 9"/>
        )}
        {cardPhotos.length > 1 && (
          <>
            <button className="card-carousel-btn prev" title="Previous photo"
              onClick={e => { stop(e); setPhotoIdx(i => (i - 1 + cardPhotos.length) % cardPhotos.length); }}>
              <Icon name="chevR" size={13}/>
            </button>
            <button className="card-carousel-btn next" title="Next photo"
              onClick={e => { stop(e); setPhotoIdx(i => (i + 1) % cardPhotos.length); }}>
              <Icon name="chevR" size={13}/>
            </button>
            <div className="card-carousel-dots" onClick={stop}>
              {cardPhotos.map((_, i) => (
                <span key={i} className={"dot" + (i === clampedIdx ? " active" : "")}
                      onClick={() => setPhotoIdx(i)}/>
              ))}
            </div>
          </>
        )}
        {showGroup && scene.group ? <span className="group-label">{scene.group}</span> : null}
        {scene.comments.length > 0 ? (
          <span className="comments-badge"><Icon name="comment" size={11}/>{scene.comments.length}</span>
        ) : null}
      </div>
      <div className="meta">
        <div className="ribbon">
          <select className={`tag ${tagCls(scene.intExt)} tag-select`} value={scene.intExt} onClick={stop}
                  onChange={e => onUpdate({ intExt: e.target.value })}>
            <option value="INT">INT</option>
            <option value="EXT">EXT</option>
            <option value="I+E">I+E</option>
          </select>
          <select className={`tag ${tagCls(scene.dn)} tag-select`} value={scene.dn} onClick={stop}
                  onChange={e => onUpdate({ dn: e.target.value })}>
            <option value="DAY">DAY</option>
            <option value="NIGHT">NIGHT</option>
            <option value="DUSK">DUSK</option>
            <option value="DAWN">DAWN</option>
          </select>
        </div>
        <input
          className="addr-edit"
          value={addr}
          onClick={stop}
          onChange={e => setAddr(e.target.value)}
          onBlur={() => onUpdate({ address: addr })}
        />
        <textarea
          className="desc-edit"
          value={desc}
          placeholder="Add scene description…"
          onClick={stop}
          onChange={e => setDesc(e.target.value)}
          onBlur={() => onUpdate({ notes: desc })}
          rows={size === "lg" ? 6 : 4}
        />
        {scene.sceneInfo ? (
          <textarea
            className="info-edit"
            value={info}
            onClick={stop}
            onChange={e => setInfo(e.target.value)}
            onBlur={() => onUpdate({ sceneInfo: info })}
            rows={2}
          />
        ) : null}
        <div className="foot">
          <div className="scriptday-edit">
            <span className="sd-lbl">SCRIPT DAY</span>
            <input
              value={scriptDay}
              placeholder="—"
              onClick={stop}
              onChange={e => setScriptDay(e.target.value)}
              onBlur={() => onUpdate({ shootDay: scriptDay.trim() === "" ? null : scriptDay })}
            />
          </div>
          <select
            className="status-select"
            value={scene.status}
            onClick={stop}
            onChange={e => onUpdate({ status: e.target.value })}
          >
            {Object.entries(STATUS).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar item ───────────────────────────────────────────
function SideItem({ active, onClick, children, count, dot, flag, onDelete }) {
  return (
    <div className={"side-item" + (active ? " active" : "")} onClick={onClick}>
      {flag ? <span className="flag">{flag}</span> : null}
      {dot ? <span className="dot" style={{ background: dot }}></span> : null}
      <span>{children}</span>
      {count != null ? <span className="count">{count}</span> : null}
      {onDelete ? (
        <button className="side-item-del" title="Delete group"
                onClick={e => { e.stopPropagation(); onDelete(); }}>
          <Icon name="trash" size={11}/>
        </button>
      ) : null}
    </div>
  );
}

// ── Scene row (compact list layout) ────────────────────────
function SceneRow({ scene, onOpen, onUpdate, isFilm, draggable, onDragStart, onDragOver, onDrop, onDragEnd, dragOver, onDuplicate, onDelete }) {
  const ep = window.STORY.EPISODES.find(e => e.id === scene.episode);
  const [locId, setLocId] = useState(scene.locationId ?? "");
  const [loc, setLoc] = useState(scene.slug);
  const [addr, setAddr] = useState(scene.address);
  useEffect(() => { setLocId(scene.locationId ?? ""); setLoc(scene.slug); setAddr(scene.address); }, [scene.id]);
  const stop = e => e.stopPropagation();

  return (
    <div
      className={"row-item" + (dragOver ? " drag-over" : "") + (!scene.group ? " row-nogroup" : "")}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="drag-handle" title="Drag to reorder"><Icon name="drag" size={13}/></span>
      <div className="row-thumb">
        {scene.photos && scene.photos.length ? (
          <img src={coverPhoto(scene)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        ) : (
          <Placeholder country={scene.country} hint={scene.photoHint} aspect="16 / 9"/>
        )}
      </div>
      {!isFilm && <span className="row-ep">EP {ep?.n}</span>}
      <span className="row-sc">SC {String(scene.scene).padStart(2,"0")}</span>
      <select className={`tag ${tagCls(scene.intExt)} tag-select`} value={scene.intExt} onClick={stop}
              onChange={e => onUpdate({ intExt: e.target.value })}>
        <option value="INT">INT</option>
        <option value="EXT">EXT</option>
        <option value="I+E">I+E</option>
      </select>
      <select className={`tag ${tagCls(scene.dn)} tag-select`} value={scene.dn} onClick={stop}
              onChange={e => onUpdate({ dn: e.target.value })}>
        <option value="DAY">DAY</option>
        <option value="NIGHT">NIGHT</option>
        <option value="DUSK">DUSK</option>
        <option value="DAWN">DAWN</option>
      </select>
      <input className="row-locid" value={locId} placeholder="ID" title="Location ID" onClick={stop}
             onChange={e => setLocId(e.target.value)}
             onBlur={() => onUpdate({ locationId: locId })}/>
      <input className="row-loc" value={loc} onClick={stop}
             onChange={e => setLoc(e.target.value)}
             onBlur={() => onUpdate({ slug: loc })}/>
      <input className="row-addr" value={addr} onClick={stop}
             onChange={e => setAddr(e.target.value)}
             onBlur={() => onUpdate({ address: addr })}/>
      <span className="row-group">{scene.group || <span style={{color:"var(--ink-4)"}}>—</span>}</span>
      <select className="status-select row-status" value={scene.status} onClick={stop}
              onChange={e => onUpdate({ status: e.target.value })}>
        {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <button className="card-expand-btn" title="Open full details" onClick={onOpen}><Icon name="eye" size={13}/></button>
      <button className="card-expand-btn" title="Duplicate" onClick={onDuplicate}><Icon name="copy" size={12}/></button>
      <button className="card-expand-btn" title="Delete" style={{color:"var(--danger)"}} onClick={onDelete}><Icon name="trash" size={12}/></button>
    </div>
  );
}

// ── Print sheets (A4, hidden on screen, shown via @media print) ─
function PrintSheets({ scenes, isFilm, perPage, computePrintPages, projectName }) {
  const { pages, perPage: resolvedPerPage } = computePrintPages(scenes, perPage);
  const landscape = Number(resolvedPerPage) === 2;
  return (
    <div className="print-sheets">
      {pages.map((page, pi) => {
        const groups = [...new Set(page.map(p => p.group))];
        const label = groups.length === 1 && groups[0] ? groups[0] : "Mixed scenes";
        const cols = landscape ? page.length : page.length > 6 ? 3 : 2;
        return (
          <div className={"print-page" + (landscape ? " landscape" : "")} key={pi} style={landscape ? { page: "landscape" } : undefined}>
            <div className="print-page-head">
              <div>
                <div className="pp-title">{projectName || "Storyboard"}</div>
                <div className="pp-sub">{label}</div>
              </div>
              <div className="pp-page-no">Page {pi + 1} / {pages.length}</div>
            </div>
            <div className="print-grid" style={{ "--pcols": cols }}>
              {page.map(({ scene: s }) => {
                const ep = window.STORY.EPISODES.find(e => e.id === s.episode);
                return (
                  <div className="print-card" key={s.id}>
                    <div className="print-card-label">
                      SCENE {!isFilm && ep ? `${ep.n} · ` : ""}{String(s.scene).padStart(2,"0")}
                    </div>
                    <div className="print-img">
                      {s.photos && s.photos.length ? (
                        <img src={s.photos[0]} alt=""/>
                      ) : (
                        <Placeholder country={s.country} hint={s.photoHint} aspect="16 / 9"/>
                      )}
                    </div>
                    <div className="print-meta">
                      <div className="print-ribbon">
                        <span className={`tag ${tagCls(s.intExt)}`}>{s.intExt}</span>
                        <span className={`tag ${tagCls(s.dn)}`}>{s.dn}</span>
                      </div>
                      <div className="print-name">{s.locationId ? `${s.locationId} · ` : ""}{s.slug}</div>
                      <div className="print-addr">{s.address}</div>
                      {s.notes ? <div className="print-notes">{s.notes}</div> : null}
                      {s.sceneInfo ? <div className="print-info">{s.sceneInfo}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Icon, Placeholder, StatusBadge, Avatar, SceneCard, SceneRow, PrintSheets, SideItem, STATUS });
