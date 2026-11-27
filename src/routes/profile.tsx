import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Camera, Check, Loader2, Mail, MapPin, Phone, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/app/AppShell";
import { useStore } from "@/hooks/use-store";
import { meta } from "@/lib/meta";
import { uploadImages } from "@/lib/storage";

export const Route = createFileRoute("/profile")({
  head: () => meta("Profile & Settings", "Manage your Power-Track profile and notification preferences."),
  component: () => (
    <AppShell>
      <Profile />
    </AppShell>
  ),
});

function Profile() {
  const { currentUser, updateUser } = useStore();
  const u = currentUser!;
  const [f, setF] = useState({ name: u.name, email: u.email, phone: u.phone, area: u.area ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, sms: false, status: true });

  const canUploadAvatar = u.role === "consumer" || u.role === "worker";
  const initials = u.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const inputClass =
    "h-12 w-full rounded-2xl border border-foreground/12 bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    const { urls, error } = await uploadImages([file], u.id);
    if (error || !urls[0]) {
      setUploadingAvatar(false);
      return toast.error(error ?? "Couldn't upload avatar.");
    }
    await updateUser(u.id, { avatarUrl: urls[0] });
    setUploadingAvatar(false);
    toast.success("Profile photo updated");
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    await updateUser(u.id, { avatarUrl: "" });
    setUploadingAvatar(false);
    toast.success("Profile photo removed");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(f.email.trim())) {
      return toast.error("Enter a valid name and email address.");
    }
    setSavingProfile(true);
    await updateUser(u.id, {
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      area: f.area.trim(),
    });
    setSavingProfile(false);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile &amp; Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal details and notification preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Personal Information Card */}
        <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7 lg:col-span-7">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-foreground">
              <User className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">Personal Information</h2>
              <p className="text-xs text-muted-foreground">Used by dispatchers and field crews to reach you.</p>
            </div>
          </div>

          {/* Profile Avatar Upload — Consumer & Field Worker Only */}
          {canUploadAvatar && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {u.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt={u.name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-foreground text-lg font-extrabold text-background">
                  {initials}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">Profile Photo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, or WebP up to 5 MB.</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-xs font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground">
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    <span>{uploadingAvatar ? "Uploading…" : u.avatarUrl ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploadingAvatar}
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>

                  {u.avatarUrl && (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={handleRemoveAvatar}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/15 bg-card px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={saveProfile} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="prof-name" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="prof-name"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-email" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="prof-email"
                  type="email"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-phone" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="prof-phone"
                  type="tel"
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  placeholder="+92 300 0000000"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-area" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Address / Zone
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="prof-area"
                  value={f.area}
                  onChange={(e) => setF({ ...f, area: e.target.value })}
                  placeholder="Street, block, or zone"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="pt-1 sm:col-span-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{savingProfile ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Notification Preferences */}
        <aside className="lg:col-span-5">
          <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground">Choose how you stay informed on repairs.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {(
                [
                  ["status", "Status change alerts", "Instant in-app updates whenever a complaint moves forward."],
                  ["email", "Email updates", "Receive summary updates at your registered email address."],
                  ["sms", "SMS alerts", "Text notifications for urgent outages and crew dispatch."],
                ] as const
              ).map(([key, title, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/8 bg-background p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(v) => {
                      setPrefs({ ...prefs, [key]: v });
                      toast.success("Preference saved");
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
