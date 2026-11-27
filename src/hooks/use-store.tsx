import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Complaint, HistoryEntry, Notification, Priority, Role, Status, User, WorkNote } from "@/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface State {
  users: User[];
  complaints: Complaint[];
  notifications: Notification[];
  currentUserId: string | null;
}

const EMPTY_STATE: State = {
  users: [],
  complaints: [],
  notifications: [],
  currentUserId: null,
};

function friendlyAuthError(raw?: string): string {
  if (raw && import.meta.env.DEV) {
    console.error("[Power-Track Auth]", raw);
  }
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid api key")) {
    return "Unable to connect to authentication right now. Please check your configuration or try again shortly.";
  }
  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password. Please double-check your details and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please verify your email address using the link we sent you before signing in.";
  }
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "Google sign-in isn't enabled yet. Please sign in with your email and password.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts right now. Please wait a moment and try again.";
  }
  if (m.includes("fetch") || m.includes("network")) {
    return "Connection issue — please check your internet and try again.";
  }
  if (m.includes("password")) {
    return "Your password doesn't meet the requirements. Use at least 6 characters.";
  }
  if (m.includes("database error")) {
    return "Your account could not be saved yet. Please make sure the database schema is set up and try again.";
  }
  return "Something went wrong. Please try again.";
}

const PROG: Record<Status, number> = {
  Submitted: 0,
  "Under Review": 10,
  Assigned: 25,
  "In Progress": 60,
  Resolved: 100,
};

interface DbProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  area: string | null;
  avatar_url: string | null;
  active: boolean;
}

interface DbComplaint {
  id: string;
  title: string;
  description: string;
  category: Complaint["category"];
  priority: Priority;
  status: Status;
  address: string;
  latitude: number | null;
  longitude: number | null;
  consumer_id: string;
  worker_id: string | null;
  images: string[] | null;
  evidence_before: string[] | null;
  evidence_after: string[] | null;
  history: HistoryEntry[] | null;
  notes: WorkNote[] | null;
  progress: number;
  duplicate_of: string | null;
  duplicate_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  complaint_id: string | null;
  created_at: string;
}

const fromDbProfile = (p: DbProfile): User => ({
  id: p.id,
  name: p.name || p.email.split("@")[0],
  email: p.email,
  phone: p.phone || "",
  role: p.role,
  area: p.area ?? undefined,
  avatarUrl: p.avatar_url ?? undefined,
  active: p.active,
});

const fromDbComplaint = (c: DbComplaint): Complaint => ({
  id: c.id,
  title: c.title,
  description: c.description,
  category: c.category,
  priority: c.priority,
  status: c.status,
  address: c.address,
  latitude: c.latitude ?? undefined,
  longitude: c.longitude ?? undefined,
  consumerId: c.consumer_id,
  workerId: c.worker_id ?? undefined,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  images: c.images ?? [],
  evidence: {
    before: c.evidence_before ?? [],
    after: c.evidence_after ?? [],
  },
  history: Array.isArray(c.history) ? c.history : [],
  notes: Array.isArray(c.notes) ? c.notes : [],
  progress: c.progress ?? 0,
  duplicateOf: c.duplicate_of ?? undefined,
  duplicateDismissed: c.duplicate_dismissed ?? false,
});

const fromDbNotification = (n: DbNotification): Notification => ({
  id: n.id,
  userId: n.user_id,
  title: n.title,
  message: n.message,
  at: n.created_at,
  read: n.read,
  complaintId: n.complaint_id ?? undefined,
});

function useStoreImpl() {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);

  const loadWorkspace = useCallback(async (uid: string) => {
    const [profilesRes, complaintsRes, notificationsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("complaints").select("*").order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);

    const users = (profilesRes.data as DbProfile[] | null)?.map(fromDbProfile) ?? [];
    const complaints = (complaintsRes.data as DbComplaint[] | null)?.map(fromDbComplaint) ?? [];
    const notifications = (notificationsRes.data as DbNotification[] | null)?.map(fromDbNotification) ?? [];

    setState({
      users,
      complaints,
      notifications,
      currentUserId: uid,
    });
    return users.find((u) => u.id === uid) ?? null;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHydrated(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        await loadWorkspace(data.session.user.id);
      } else {
        setState(EMPTY_STATE);
      }
      if (active) setHydrated(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void loadWorkspace(session.user.id);
      } else {
        setState(EMPTY_STATE);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadWorkspace]);

  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;
  const now = () => new Date().toISOString();
  const roleLabel = (r?: Role) => (r === "admin" ? "Admin" : r === "worker" ? "Field Worker" : "Consumer");

  const refreshNotifications = async (uid: string) => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const mapped = (data as DbNotification[]).map(fromDbNotification);
    setState((s) => (s.currentUserId === uid ? { ...s, notifications: mapped } : s));
  };

  // Notifications are created by database triggers; listen for new ones in realtime
  // and refresh complaints/profiles so newly assigned tasks open immediately.
  useEffect(() => {
    const uid = state.currentUserId;
    if (!uid || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const incoming = fromDbNotification(payload.new as DbNotification);
          setState((s) =>
            s.notifications.some((n) => n.id === incoming.id)
              ? s
              : { ...s, notifications: [incoming, ...s.notifications] },
          );
          if (incoming.complaintId) {
            void loadWorkspace(uid);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [state.currentUserId, loadWorkspace]);

  const loginWithPassword = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { user: null, error: "Sign-in is currently unavailable. Please try again shortly." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      return { user: null, error: friendlyAuthError(error?.message) };
    }
    const user = await loadWorkspace(data.user.id);
    if (!user) {
      return {
        user: null,
        error: "We couldn't load your profile yet. Please try again in a moment.",
      };
    }
    if (!user.active) {
      await supabase.auth.signOut();
      return {
        user: null,
        error:
          user.role === "worker"
            ? "Your Field Worker account is pending administrator approval. You'll be able to sign in once approved."
            : "This account is currently deactivated. Please contact an administrator.",
      };
    }
    return { user };
  };

  const loginWithOAuth = async (provider: "google"): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: "Google sign-in is currently unavailable. Please try again shortly." };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      },
    });
    return error ? { error: friendlyAuthError(error.message) } : {};
  };

  const register = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: "consumer" | "worker";
    area?: string;
  }): Promise<{ user: User | null; needsConfirmation?: boolean; pendingApproval?: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { user: null, error: "Registration is currently unavailable. Please try again shortly." };
    }
    const requestedRole = data.role === "worker" ? "worker" : "consumer";
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          requested_role: requestedRole,
          area: data.area?.trim() || undefined,
        },
      },
    });
    if (error) return { user: null, error: friendlyAuthError(error.message) };
    if (requestedRole === "worker") {
      if (authData.session) await supabase.auth.signOut();
      setState(EMPTY_STATE);
      return { user: null, pendingApproval: true };
    }
    if (!authData.session || !authData.user) {
      return { user: null, needsConfirmation: true };
    }
    const user = await loadWorkspace(authData.user.id);
    if (!user) {
      return {
        user: null,
        error: "Account created, but your profile could not be loaded yet. Please try signing in.",
      };
    }
    return { user };
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setState(EMPTY_STATE);
  };

  const sendPasswordReset = async (email: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: "Password reset is currently unavailable. Please try again shortly." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined,
    });
    return error ? { error: friendlyAuthError(error.message) } : {};
  };

  const updatePassword = async (password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) return { error: "Password updates are currently unavailable." };
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: friendlyAuthError(error.message) } : {};
  };

  const updateUser = async (id: string, patch: Partial<User>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.area !== undefined) dbPatch.area = patch.area || null;
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl || null;
    if (patch.role !== undefined) dbPatch.role = patch.role;
    if (patch.active !== undefined) dbPatch.active = patch.active;

    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", id);
    if (error) {
      toast.error(error.message);
      if (state.currentUserId) void loadWorkspace(state.currentUserId);
    }
  };

  /** Creates a complaint. The database assigns the ID and creates notifications. Returns the new ID. */
  const addComplaint = async (c: Complaint): Promise<string | null> => {
    const payload = {
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      address: c.address,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      consumer_id: c.consumerId,
      worker_id: c.workerId ?? null,
      images: c.images,
      evidence_before: c.evidence.before,
      evidence_after: c.evidence.after,
      history: c.history,
      notes: c.notes,
      progress: c.progress,
      duplicate_of: c.duplicateOf ?? null,
      duplicate_dismissed: c.duplicateDismissed ?? false,
    };

    const { data, error } = await supabase.from("complaints").insert(payload).select("*").single();
    if (error || !data) {
      if (import.meta.env.DEV && error) console.error("[Power-Track DB]", error.message);
      toast.error("We couldn't submit your complaint. Please try again.");
      return null;
    }

    const created = fromDbComplaint(data as DbComplaint);
    setState((s) => ({ ...s, complaints: [created, ...s.complaints] }));
    void refreshNotifications(created.consumerId);
    return created.id;
  };

  const patchComplaint = async (
    id: string,
    build: (c: Complaint) => { patch: Partial<Complaint>; dbPatch: Record<string, unknown> },
  ) => {
    const target = state.complaints.find((c) => c.id === id);
    if (!target) return;
    const { patch, dbPatch } = build(target);
    const updatedAt = now();

    setState((s) => ({
      ...s,
      complaints: s.complaints.map((c) => (c.id === id ? { ...c, ...patch, updatedAt } : c)),
    }));

    const { error } = await supabase.from("complaints").update(dbPatch).eq("id", id);
    if (error) {
      if (import.meta.env.DEV) console.error("[Power-Track DB]", error.message);
      toast.error(error.message.includes("Only administrators") ? error.message : "That change couldn't be saved. Please try again.");
      if (state.currentUserId) void loadWorkspace(state.currentUserId);
    }
  };

  const setStatus = (id: string, status: Status, note?: string) =>
    void patchComplaint(id, (c) => {
      const progress = Math.max(PROG[status], status === "Resolved" ? 100 : c.progress);
      const history = [...c.history, { status, at: now(), by: roleLabel(currentUser?.role), note }];
      return { patch: { status, progress, history }, dbPatch: { status, progress, history } };
    });

  const assign = (id: string, workerId: string) =>
    void patchComplaint(id, (c) => {
      const w = state.users.find((u) => u.id === workerId);
      const status: Status = c.status === "Submitted" || c.status === "Under Review" ? "Assigned" : c.status;
      const progress = Math.max(c.progress, 25);
      const history = [...c.history, { status: "Assigned" as Status, at: now(), by: "Admin", note: `Assigned to ${w?.name ?? "worker"}` }];
      return {
        patch: { workerId, status, progress, history },
        dbPatch: { worker_id: workerId, status, progress, history },
      };
    });

  const setPriority = (id: string, priority: Priority) =>
    void patchComplaint(id, () => ({ patch: { priority }, dbPatch: { priority } }));

  const setProgress = (id: string, progress: number) =>
    void patchComplaint(id, () => ({ patch: { progress }, dbPatch: { progress } }));

  const addNote = (id: string, text: string) =>
    void patchComplaint(id, (c) => {
      const notes = [...c.notes, { at: now(), by: currentUser?.name ?? "Worker", text }];
      return { patch: { notes }, dbPatch: { notes } };
    });

  const addEvidence = (id: string, kind: "before" | "after", url: string) =>
    void patchComplaint(id, (c) => {
      const next = [...c.evidence[kind], url];
      return {
        patch: { evidence: { ...c.evidence, [kind]: next } },
        dbPatch: kind === "before" ? { evidence_before: next } : { evidence_after: next },
      };
    });

  const resolveDuplicate = (id: string, action: "merge" | "dismiss") =>
    void patchComplaint(id, (c) => {
      if (action === "dismiss") {
        return { patch: { duplicateDismissed: true }, dbPatch: { duplicate_dismissed: true } };
      }
      const history = [...c.history, { status: "Resolved" as Status, at: now(), by: "Admin", note: `Merged into ${c.duplicateOf}` }];
      return {
        patch: { status: "Resolved", progress: 100, duplicateDismissed: true, history },
        dbPatch: { status: "Resolved", progress: 100, duplicate_dismissed: true, history },
      };
    });

  const markRead = async (id: string) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!state.currentUserId) return;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.userId === s.currentUserId ? { ...n, read: true } : n)),
    }));
    await supabase.from("notifications").update({ read: true }).eq("user_id", state.currentUserId).eq("read", false);
  };

  const myNotifications = useMemo(
    () => state.notifications.filter((n) => n.userId === state.currentUserId),
    [state.notifications, state.currentUserId],
  );

  return {
    ...state,
    hydrated,
    currentUser,
    myNotifications,
    isSupabaseConfigured,
    loginWithPassword,
    loginWithOAuth,
    register,
    logout,
    sendPasswordReset,
    updatePassword,
    updateUser,
    addComplaint,
    setStatus,
    assign,
    setPriority,
    setProgress,
    addNote,
    addEvidence,
    resolveDuplicate,
    markRead,
    markAllRead,
    refresh: () => (state.currentUserId ? loadWorkspace(state.currentUserId) : Promise.resolve(null)),
    userById: (id?: string) => state.users.find((u) => u.id === id),
  };
}

type Store = ReturnType<typeof useStoreImpl>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreImpl();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export const homeFor = (r: Role) => (r === "admin" ? "/admin" : r === "worker" ? "/worker" : "/consumer");
