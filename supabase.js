// supabase.js — auth client for Storyboard (plain JS, no build step)
(function () {
  const SUPABASE_URL = "https://uzziitdgtwkvkbkjjbum.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_5nQSovrfrP8SRxme9Tdb4g_bXpG3WCq";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function signUp(email, password) {
    return await sb.auth.signUp({ email, password });
  }
  async function signIn(email, password) {
    return await sb.auth.signInWithPassword({ email, password });
  }
  async function signOut() {
    return await sb.auth.signOut();
  }
  // Sends a reset link (not the password itself — nothing can retrieve a real
  // password, it's only ever stored hashed). The link lands on reset-password.html.
  async function resetPasswordForEmail(email) {
    return await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password.html",
    });
  }
  async function updatePassword(newPassword) {
    return await sb.auth.updateUser({ password: newPassword });
  }
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  }
  function onAuthChange(callback) {
    return sb.auth.onAuthStateChange(callback);
  }

  // Keeps the sessionStorage gate (checked by index.html/dashboard.html) in sync
  // with the real Supabase session, so a returning visitor with a persisted
  // Supabase session (localStorage, survives closing the tab) doesn't get
  // bounced to the login screen unnecessarily.
  async function syncAuthFlag() {
    const session = await getSession();
    if (session) {
      sessionStorage.setItem("sb_auth", "1");
      sessionStorage.setItem("sb_user_email", session.user.email || "");
    } else {
      sessionStorage.removeItem("sb_auth");
      sessionStorage.removeItem("sb_user_email");
    }
    return session;
  }

  window.SB_AUTH = { signUp, signIn, signOut, getSession, onAuthChange, syncAuthFlag, resetPasswordForEmail, updatePassword };

  // ── Per-user project storage (Postgres + RLS — replaces the old
  // localStorage-based project list, which leaked between anyone using the
  // same browser regardless of which account they'd signed in as) ──
  async function listProjects() {
    const session = await getSession();
    if (!session) return [];
    // No user_id filter here — RLS already returns the union of projects this
    // account owns *and* projects it's been invited to (project_members).
    const { data, error } = await sb
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) { console.error("[SB_DATA] listProjects", error); return []; }
    return data.map((r) => ({ ...r, isOwner: r.user_id === session.user.id }));
  }
  async function getProject(id) {
    const { data, error } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) { console.error("[SB_DATA] getProject", error); return null; }
    return data;
  }
  async function createProject(project) {
    const session = await getSession();
    if (!session) throw new Error("Not signed in");
    const row = { ...project, user_id: session.user.id };
    const { data, error } = await sb.from("projects").insert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function updateProject(id, patch) {
    const { data, error } = await sb.from("projects").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteProject(id) {
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  }
  async function getProjectData(projectId) {
    // Throws (rather than swallowing) on a real fetch error, so the caller can
    // tell "no row yet" (data === null, error === null — a brand-new project)
    // apart from "the fetch failed" — treating the latter as empty data would
    // wipe out an existing project's scenes the moment autosave next fires.
    const { data, error } = await sb.from("project_data").select("*").eq("project_id", projectId).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function saveProjectData(projectId, bundle) {
    const row = { project_id: projectId, ...bundle, updated_at: new Date().toISOString() };
    const { error } = await sb.from("project_data").upsert(row, { onConflict: "project_id" });
    if (error) throw error;
  }
  // Live sync: fires on any change to this project's data, from any device or
  // collaborator (Realtime is enabled on the project_data table). Returns an
  // unsubscribe function.
  function subscribeToProjectData(projectId, onChange) {
    const channel = sb
      .channel("project_data:" + projectId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_data", filter: "project_id=eq." + projectId },
        (payload) => onChange(payload.new)
      )
      .subscribe();
    return () => sb.removeChannel(channel);
  }

  // ── Collaborators — invited by email, granted access via RLS the moment
  // they sign in with a matching address (see project_members policies) ──
  async function listMembers(projectId) {
    const { data, error } = await sb.from("project_members").select("*").eq("project_id", projectId).order("created_at", { ascending: true });
    if (error) { console.error("[SB_DATA] listMembers", error); return []; }
    return data;
  }
  async function inviteMember(projectId, email) {
    const session = await getSession();
    const row = { project_id: projectId, email: email.toLowerCase().trim(), invited_by: session?.user?.id || null };
    const { data, error } = await sb.from("project_members").insert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function removeMember(id) {
    const { error } = await sb.from("project_members").delete().eq("id", id);
    if (error) throw error;
  }
  // Fire-and-forget notification email — the access grant already happened via
  // the RLS-protected insert above; this is just a courtesy heads-up.
  async function sendInviteEmail({ projectId, projectName, toEmail }) {
    const session = await getSession();
    try {
      await fetch("/api/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, projectName, toEmail, fromEmail: session?.user?.email || "" }),
      });
    } catch (err) {
      console.error("[SB_DATA] sendInviteEmail", err);
    }
  }

  // ── Public share links — anyone with the id, no account needed. The link
  // always resolves live against current project_data (see get_shared_scenes,
  // a SECURITY DEFINER function), so edits show up next time it's opened —
  // there's no snapshot to go stale. ──
  function randomShareId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(36)).join("").slice(0, 10);
  }
  async function createShare(projectId, { scopeType = "all", scopeName = null, permission = "view" } = {}) {
    const session = await getSession();
    const row = {
      id: randomShareId(), project_id: projectId,
      scope_type: scopeType, scope_name: scopeName, permission,
      created_by: session?.user?.id || null,
    };
    const { data, error } = await sb.from("shares").insert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function getSharedScenes(shareId) {
    const { data, error } = await sb.rpc("get_shared_scenes", { p_share_id: shareId });
    if (error) { console.error("[SB_DATA] getSharedScenes", error); return null; }
    return data && data[0] ? data[0] : null;
  }
  // Anonymous commenting — only works if the share's permission is "comment"
  // (enforced server-side in the RPC, not just hidden client-side).
  async function addSharedComment(shareId, sceneId, name, text) {
    const { data, error } = await sb.rpc("add_shared_comment", {
      p_share_id: shareId, p_scene_id: sceneId, p_name: name, p_text: text,
    });
    if (error) throw error;
    return data;
  }

  window.SB_DATA = {
    listProjects, getProject, createProject, updateProject, deleteProject, getProjectData, saveProjectData,
    subscribeToProjectData,
    listMembers, inviteMember, removeMember, sendInviteEmail,
    createShare, getSharedScenes, addSharedComment,
  };
})();
