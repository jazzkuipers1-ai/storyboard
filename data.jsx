// data.jsx — sample data for "The Camino" location storyboard

const FLAG_FR = (
  <svg viewBox="0 0 6 4" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
    <rect width="2" height="4" x="0" fill="#0055A4"/>
    <rect width="2" height="4" x="2" fill="#FFFFFF"/>
    <rect width="2" height="4" x="4" fill="#EF4135"/>
  </svg>
);
const FLAG_YU = ( // Yugoslavia 1987
  <svg viewBox="0 0 6 4" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
    <rect width="6" height="1.333" y="0"     fill="#3C6EB4"/>
    <rect width="6" height="1.333" y="1.333" fill="#FFFFFF"/>
    <rect width="6" height="1.334" y="2.666" fill="#D52B1E"/>
    <polygon points="3,1.4 3.18,1.86 3.66,1.86 3.27,2.14 3.42,2.6 3,2.34 2.58,2.6 2.73,2.14 2.34,1.86 2.82,1.86" fill="#FFCC00" stroke="#000" strokeWidth=".05"/>
  </svg>
);
const FLAG_NL = (
  <svg viewBox="0 0 6 4" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
    <rect width="6" height="1.333" y="0"     fill="#AE1C28"/>
    <rect width="6" height="1.333" y="1.333" fill="#FFFFFF"/>
    <rect width="6" height="1.334" y="2.666" fill="#21468B"/>
  </svg>
);
const FLAG_DE = (
  <svg viewBox="0 0 6 4" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
    <rect width="6" height="1.333" y="0"     fill="#000000"/>
    <rect width="6" height="1.333" y="1.333" fill="#DD0000"/>
    <rect width="6" height="1.334" y="2.666" fill="#FFCE00"/>
  </svg>
);

const EPISODES = [
  { id: "ep1", n: 101, title: "Le Puy",         country: "France",       era: "Present day",  flag: FLAG_FR, color: "#3C6EB4" },
  { id: "ep2", n: 102, title: "Sarajevo Spring", country: "Yugoslavia",   era: "1987",         flag: FLAG_YU, color: "#D52B1E" },
  { id: "ep3", n: 103, title: "Amstel",         country: "The Netherlands", era: "Present day", flag: FLAG_NL, color: "#21468B" },
  { id: "ep4", n: 104, title: "Schwarzwald",    country: "Germany",      era: "2005",         flag: FLAG_DE, color: "#1B1B1B" },
];

// palette for placeholders — tied to country
const PH = {
  France:        ["oklch(0.86 0.05 75)", "oklch(0.82 0.06 60)"],
  Yugoslavia:    ["oklch(0.74 0.05 30)", "oklch(0.68 0.06 25)"],
  "The Netherlands":["oklch(0.85 0.04 220)", "oklch(0.8 0.05 230)"],
  Germany:       ["oklch(0.72 0.03 100)", "oklch(0.66 0.04 110)"],
};

// avatar palette for collaborators
const TEAM = [
  { id: "mw", name: "Mira Weiss",     color: "#D97757", role: "Director" },
  { id: "jb", name: "Jens Bakker",    color: "#3C6EB4", role: "Location scout" },
  { id: "sk", name: "Sofija Kalin",   color: "#2A6F3C", role: "1st AD" },
  { id: "lh", name: "Lukas Hartmann", color: "#8B5A3C", role: "DP" },
  { id: "an", name: "Anouk Vermeer",  color: "#7A5AE0", role: "Producer" },
];

// All scenes
let _id = 0;
const sc = (ep, num, intExt, dn, slug, address, status, group, photoHint, notes, comments=[]) => ({
  id: `s${++_id}`,
  scene: num, episode: ep,
  intExt, dn, slug, address, status, group, photoHint, notes, comments,
  photos: [],
});

const SCENES = [
  // — Ep 1 (Le Puy, France) —
  sc("ep1", 1, "EXT", "DAY",   "CATHÉDRALE NOTRE-DAME DU PUY",      "Place du For, Le Puy-en-Velay, France",          "scouted", "Le Puy — Cathedral", "facade",
     "Opening shot — pilgrims gathering before the morning blessing. Need overhead drone permission.",
     [
       {user:"jb", text:"Mairie permit confirmed for week 14. Drone OK only before 09:00.", ts:"2d"},
       {user:"mw", text:"Can we also block the steps for the close-ups? Otherwise we shoot wide first.", ts:"1d"},
     ]),
  sc("ep1", 2, "INT", "NIGHT", "HÔTEL DU CHEMIN — ROOM 14",          "Rue du Chemin de Compostelle, Le Puy-en-Velay", "locked",  "Le Puy — Hôtel du Chemin", "room",
     "Anna packs her bag. Practical lamp on bedside, no overheads. The window faces the cathedral — we want it in soft focus.", []),
  sc("ep1", 3, "INT", "DAY",   "HÔTEL DU CHEMIN — LOBBY",            "Rue du Chemin de Compostelle, Le Puy-en-Velay", "locked",  "Le Puy — Hôtel du Chemin", "lobby",
     "Breakfast service. Mostly background — we follow Anna out the door.", []),
  sc("ep1", 4, "INT", "DAY",   "HÔTEL DU CHEMIN — BREAKFAST ROOM",   "Rue du Chemin de Compostelle, Le Puy-en-Velay", "scouted", "Le Puy — Hôtel du Chemin", "interior",
     "Tight quarters. Window seat reserved for the dialogue.",
     [{user:"lh", text:"Window light is north-facing — gorgeous between 9–11.", ts:"3d"}]),
  sc("ep1", 5, "EXT", "DAY",   "PILGRIM'S PATH — GR65",              "GR65 trail, Saint-Privat-d'Allier, France",     "todo",    null, "landscape",
     "Anna's first day walking. Empty road, mist burning off.", []),
  sc("ep1", 6, "EXT", "DAY",   "STONE BRIDGE — RIVIÈRE ALLIER",      "Pont de la Recluse, Monistrol-d'Allier, France", "todo",   null, "bridge",
     "Slow crossing. We hear water before we see it.", []),
  sc("ep1", 7, "INT", "NIGHT", "GÎTE COMMUNAL — DORM",                "Route de Saugues, Saint-Privat-d'Allier",        "scouted","Saugues — Gîte communal", "room",
     "Bunk room. Six pilgrims, one snorer. Played for warmth, not comedy.", []),
  sc("ep1", 8, "INT", "DAY",   "GÎTE COMMUNAL — KITCHEN",             "Route de Saugues, Saint-Privat-d'Allier",        "scouted","Saugues — Gîte communal", "interior",
     "Communal breakfast. Long wooden table.", []),
  sc("ep1", 9, "EXT", "DAY",   "ABBATIALE SAINTE-FOY — CONQUES",      "Place de l'Église, Conques, France",             "scouted",null, "facade",
     "Anna arrives at Conques. Bells. End of episode.",
     [{user:"an", text:"Lock this. Sunset window is 19:40 in May.", ts:"4h"}]),

  // — Ep 2 (Yugoslavia 1987) —
  sc("ep2", 1, "EXT", "DAY",   "BAŠČARŠIJA — MORNING MARKET",         "Baščaršija, Sarajevo (period dress)",            "scouted", "Sarajevo — Baščaršija", "street",
     "1987. Period dress, no cars after 1985. Coppersmiths working.", []),
  sc("ep2", 2, "INT", "DAY",   "TAILOR SHOP — DRAGAN'S",              "Kazandžiluk 12, Sarajevo",                       "locked",  "Sarajevo — Baščaršija", "interior",
     "Dragan finishes a coat. Background radio plays the news.",
     [{user:"sk", text:"Wardrobe needs 2 days here for fittings before we shoot.", ts:"1w"}]),
  sc("ep2", 3, "INT", "NIGHT", "MIRA'S APARTMENT — KITCHEN",          "Hrasno block 7, Sarajevo (period)",              "scouted","Mira's apartment", "interior",
     "Linoleum, Yugoslav stove. Dinner is sarma.", []),
  sc("ep2", 4, "INT", "NIGHT", "MIRA'S APARTMENT — LIVING ROOM",      "Hrasno block 7, Sarajevo (period)",              "scouted","Mira's apartment", "interior",
     "TV showing partizan football. Family argues over emigration papers.", []),
  sc("ep2", 5, "EXT", "DAY",   "ŽELJEZNIČKA STANICA — PLATFORM",       "Sarajevo Main Station (period dress)",           "todo",  null, "exterior",
     "Departure. Goodbye on the platform.", []),
  sc("ep2", 6, "INT", "DAY",   "TRAIN COMPARTMENT — BELGRADE LINE",    "Heritage rolling stock — Požega depot",          "todo",  null, "interior",
     "Six-seat compartment. Period luggage rack practical.", []),

  // — Ep 3 (Netherlands, present) —
  sc("ep3", 1, "INT", "DAY",   "ANNA'S FLAT — KITCHEN",                "Kerkstraat 88, Amsterdam",                       "locked",  "Amsterdam — Anna's flat", "interior",
     "Returning home. The apartment is exactly as she left it.", []),
  sc("ep3", 2, "INT", "DAY",   "ANNA'S FLAT — LIVING ROOM",            "Kerkstraat 88, Amsterdam",                       "locked",  "Amsterdam — Anna's flat", "interior",
     "She unpacks the shells from Conques.", []),
  sc("ep3", 3, "INT", "NIGHT", "ANNA'S FLAT — BEDROOM",                "Kerkstraat 88, Amsterdam",                       "scouted","Amsterdam — Anna's flat", "room",
     "Can't sleep. Calls her mother.", []),
  sc("ep3", 4, "EXT", "NIGHT", "PRINSENGRACHT — BRIDGE",               "Prinsengracht / Leidsegracht, Amsterdam",        "scouted",null, "bridge",
     "Walking home after dinner. Late spring.",
     [{user:"jb", text:"Need to coordinate with the city — bridge closure 22:00–02:00 only.", ts:"3d"}]),
  sc("ep3", 5, "INT", "DAY",   "CAFÉ DE JAREN",                         "Nieuwe Doelenstraat 20, Amsterdam",              "shot",    null, "interior",
     "Coffee with her sister. They argue about their mother.", []),
  sc("ep3", 6, "EXT", "DAY",   "VONDELPARK — LAKE",                     "Vondelpark west, Amsterdam",                     "todo",    null, "landscape",
     "Sunday joggers, pedalboats. Mostly background.", []),

  // — Ep 4 (Germany 2005) —
  sc("ep4", 1, "EXT", "DAY",   "FOREST TRAIL — SCHWARZWALD",            "Schluchsee, Baden-Württemberg, Germany",         "scouted", null, "landscape",
     "2005. Mid-summer. Long walk-and-talk.", []),
  sc("ep4", 2, "INT", "DAY",   "HÜTTE — KITCHEN",                       "Forsthaus near Schluchsee",                      "scouted", "Schwarzwald — Hütte", "interior",
     "Cabin kitchen. Klaus makes coffee from a moka pot.",
     [{user:"lh", text:"There's only one window — we'll need a bounce outside.", ts:"5d"}]),
  sc("ep4", 3, "INT", "DAY",   "HÜTTE — LIVING ROOM",                   "Forsthaus near Schluchsee",                      "scouted", "Schwarzwald — Hütte", "interior",
     "Maps spread on the floor. Klaus traces the Camino route.", []),
  sc("ep4", 4, "INT", "NIGHT", "HÜTTE — ATTIC BEDROOM",                 "Forsthaus near Schluchsee",                      "todo",    "Schwarzwald — Hütte", "room",
     "Klaus reads his father's wartime letters.", []),
  sc("ep4", 5, "EXT", "DAY",   "GASTHAUS HIRSCH — TERRACE",             "Hauptstraße 14, Schluchsee",                     "locked",  null, "facade",
     "Sunday lunch with the village. Long table.", []),
  sc("ep4", 6, "EXT", "NIGHT", "COUNTRY ROAD — B500",                   "B500 near Titisee, Baden-Württemberg",           "todo",    null, "exterior",
     "Driving home alone. The last shot of the season.", []),
];

// AI group suggestions — based on slug pattern but with extras already-grouped excluded
const SUGGESTIONS = [
  {
    id: "sug1",
    name: "Conques — Abbey complex",
    reason: "2 scenes share the location 'Conques'",
    sceneIds: ["s9"],
    confidence: 0.62,
  },
  {
    id: "sug2",
    name: "Prinsengracht — Canal exteriors",
    reason: "Adjacent exterior bridge/canal scenes in Amsterdam",
    sceneIds: ["s17"],
    confidence: 0.71,
  },
  {
    id: "sug3",
    name: "GR65 — Trail walks",
    reason: "3 scenes along the GR65 pilgrim trail (ep 101 + ep 104)",
    sceneIds: ["s5", "s6", "s22"],
    confidence: 0.84,
  },
];

// Shooting order — reflects the actual draaiplanning (locations shot together),
// which differs from script/episode order. Format: [episodeId, sceneNumber, shootDay].
const SHOOT_ORDER = [
  ["ep1", 2, 1], ["ep1", 3, 1], ["ep1", 4, 1],
  ["ep1", 1, 2],
  ["ep1", 5, 3], ["ep1", 6, 3],
  ["ep1", 7, 4], ["ep1", 8, 4],
  ["ep1", 9, 5],
  ["ep2", 3, 6], ["ep2", 4, 6],
  ["ep2", 1, 7], ["ep2", 2, 7],
  ["ep2", 5, 8], ["ep2", 6, 8],
  ["ep3", 1, 9], ["ep3", 2, 9], ["ep3", 3, 9],
  ["ep3", 4, 10],
  ["ep3", 5, 11], ["ep3", 6, 11],
  ["ep4", 2, 12], ["ep4", 3, 12], ["ep4", 4, 12],
  ["ep4", 1, 13], ["ep4", 5, 13],
  ["ep4", 6, 14],
];
SHOOT_ORDER.forEach(([ep, num, day], i) => {
  const s = SCENES.find(x => x.episode === ep && x.scene === num);
  if (s) { s.shootDay = day; s.shootIndex = i; }
});

window.STORY = { EPISODES, SCENES, SUGGESTIONS, TEAM, PH, FLAG_FR, FLAG_YU, FLAG_NL, FLAG_DE };

// Project-scoped boot: swap the seed ("The Camino") data for the signed-in
// user's own project (fetched from Supabase, RLS-scoped to their account —
// see supabase.js SB_DATA), before the app mounts. app.jsx awaits
// window.STORY_READY before calling ReactDOM.render, so this can be async.
window.STORY_READY = (async function () {
  const projectId = new URLSearchParams(location.search).get("project");
  if (!projectId) { window.location.href = "dashboard.html"; return new Promise(() => {}); }
  try {
    const [project, projectData] = await Promise.all([
      window.SB_DATA.getProject(projectId),
      window.SB_DATA.getProjectData(projectId),
    ]);
    if (!project) {
      // Not found, or not owned/shared with the signed-in user (RLS) — there's
      // nothing valid to render, so bounce to the dashboard instead of
      // silently falling through to the stale hardcoded demo data above.
      window.location.href = "dashboard.html";
      return new Promise(() => {}); // never resolves — a redirect is already underway
    }
    window.STORY.SCENES = projectData?.scenes || [];
    window.STORY.EPISODES = projectData?.episodes || [];
    window.STORY.SUGGESTIONS = projectData?.suggestions || [];
    window.STORY.PROJECT = { id: projectId, name: project.name, type: project.type };
  } catch (err) {
    console.error("Failed to load project data", err);
    window.location.href = "dashboard.html";
    return new Promise(() => {});
  }
})();
