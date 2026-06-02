// src/components/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Check,
  X,
  Lock,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Plus,
  Camera,
  ShieldCheck,
  Star,
  Building2,
  BadgeIndianRupee,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Brand icons — lucide-react removed LinkedIn/GitHub (trademark), so
 *  these tiny inline SVGs mimic lucide's API (accept className/props).
 * ------------------------------------------------------------------ */
function Linkedin({ className, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function Github({ className, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.31-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.87.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 *  Profile.jsx
 *  ----------------------------------------------------------------
 *  A self-profile page. The signed-in user can edit PERSONAL fields
 *  only. Role / placement / HR-evaluation are managed by Admin & HR,
 *  so they render read-only (with a lock affordance).
 *
 *  Editable  : name, phone, bio, profilePicture, linkedIn, github,
 *              skills (trainee) | expertise (trainer)
 *  Read-only : email, role, status, batch, placement, hrEvaluation
 *
 *  Props
 *    user    : User document (see Mongoose model)
 *    onSave  : async (patch) => void   // called with edited fields
 * ------------------------------------------------------------------ */

const ROLE_STYLE = {
  admin:   "bg-rose-100 text-rose-700 ring-rose-200",
  trainer: "bg-blue-100 text-blue-700 ring-blue-200",
  trainee: "bg-violet-100 text-violet-700 ring-violet-200",
  hr:      "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

const PLACEMENT_STYLE = {
  enrolled:            "bg-slate-100 text-slate-600",
  training:            "bg-sky-100 text-sky-700",
  ready:               "bg-amber-100 text-amber-700",
  interview_scheduled: "bg-indigo-100 text-indigo-700",
  placed:              "bg-emerald-100 text-emerald-700",
  not_placed:          "bg-rose-100 text-rose-700",
};

/* ---------- small building blocks ---------------------------------- */

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function SectionCard({ title, icon: Icon, locked, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-sm font-semibold tracking-tight text-slate-800">
            {title}
          </h2>
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              <Lock className="h-3 w-3" /> Managed by Admin
            </span>
          )}
        </div>
        {action}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Field({ label, icon: Icon, value, onChange, editing, type = "text", placeholder, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
          <span className={value ? "" : "text-slate-400"}>
            {value || "Not provided"}
          </span>
        </div>
      )}
    </div>
  );
}

function ReadOnlyRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && (
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const tone =
    value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-800">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${tone} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function TagEditor({ tags, editing, onAdd, onRemove, accent = "indigo" }) {
  const [draft, setDraft] = useState("");
  const ring = `ring-${accent}-200`;
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onAdd(v);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.length === 0 && !editing && (
        <span className="text-sm text-slate-400">None added yet</span>
      )}
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center gap-1.5 rounded-full bg-${accent}-50 px-3 py-1 text-xs font-medium text-${accent}-700 ring-1 ${ring}`}
        >
          {t}
          {editing && (
            <button
              type="button"
              onClick={() => onRemove(t)}
              className="rounded-full p-0.5 hover:bg-white/60"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {editing && (
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="Add…"
            className="w-20 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={add}
            className="grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-white"
            aria-label="Add tag"
          >
            <Plus className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}

/* ---------- main component ----------------------------------------- */

export default function Profile({ user, onSave }) {
  const editableInit = useMemo(
    () => ({
      name: user?.name || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      profilePicture: user?.profilePicture || "",
      linkedIn: user?.linkedIn || "",
      github: user?.github || "",
      skills: [...(user?.skills || [])],
      expertise: [...(user?.expertise || [])],
    }),
    [user]
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(editableInit);

  // Keep the form in sync with the backend `user`. useState only reads its
  // initial value once, so without this the form would stay stuck on the data
  // present at first render (sample / empty) and ignore data that arrives later
  // from the API (fetchCurrentUser, or a fresh user after a successful save).
  // We skip the resync while editing so an incoming update can't clobber the
  // user's unsaved changes.
  useEffect(() => {
    if (!editing) setForm(editableInit);
  }, [editableInit, editing]);

  const isTrainee = user?.role === "trainee";
  const isTrainer = user?.role === "trainer";
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const cancel = () => {
    setForm(editableInit);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      // onSave may return false to signal "stay in edit mode" (e.g. no changes).
      const result = await onSave?.(form);
      if (result !== false) setEditing(false);
    } catch {
      // Save failed — keep the form open so the user can retry.
      // The container surfaces the actual error message (toast / banner).
    } finally {
      setSaving(false);
    }
  };

  const hr = user?.hrEvaluation;

  // No mock fallback: rely entirely on backend data. The container
  // (ProfilePage) shows the loading state; if it ever renders us without a
  // user, render nothing rather than crash.
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/60 font-sans antialiased">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .font-sans{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif}`}</style>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          <div className="h-24 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 sm:h-28" />
          <div className="px-5 pb-5 sm:px-7 sm:pb-6">
            <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                <div className="relative">
                  {form.profilePicture ? (
                    <img
                      src={form.profilePicture}
                      alt={form.name}
                      className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br from-indigo-500 to-blue-600 text-2xl font-bold text-white shadow-md sm:h-24 sm:w-24">
                      {initials(form.name)}
                    </div>
                  )}
                  {editing && (
                    <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-white shadow ring-2 ring-white">
                      <Camera className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      {form.name || "Your name"}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${
                        ROLE_STYLE[user.role] || ROLE_STYLE.trainee
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Edit / Save actions (desktop) */}
              <div className="hidden sm:flex sm:items-center sm:gap-2">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
                  >
                    <Pencil className="h-4 w-4" /> Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancel}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="mt-5 space-y-5">
          {/* Personal info (editable) */}
          <SectionCard
            title="Personal Information"
            icon={ShieldCheck}
            action={
              !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Edit
                </button>
              )
            }
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Full name" value={form.name} onChange={set("name")} editing={editing} placeholder="Your name" />
              <Field label="Phone" icon={Phone} value={form.phone} onChange={set("phone")} editing={editing} placeholder="+91 …" />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Bio
                </label>
                {editing ? (
                  <textarea
                    value={form.bio}
                    onChange={(e) => set("bio")(e.target.value)}
                    rows={3}
                    placeholder="Tell us a little about yourself…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                  />
                ) : (
                  <p className={`text-sm leading-relaxed ${form.bio ? "text-slate-700" : "text-slate-400"}`}>
                    {form.bio || "No bio added yet."}
                  </p>
                )}
              </div>
              {editing && (
                <Field
                  full
                  label="Profile picture URL"
                  icon={Camera}
                  value={form.profilePicture}
                  onChange={set("profilePicture")}
                  editing={editing}
                  placeholder="https://…"
                />
              )}
            </div>
          </SectionCard>

          {/* Social links (editable) */}
          <SectionCard title="Social Links" icon={Linkedin}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="LinkedIn" icon={Linkedin} value={form.linkedIn} onChange={set("linkedIn")} editing={editing} placeholder="linkedin.com/in/…" />
              <Field label="GitHub" icon={Github} value={form.github} onChange={set("github")} editing={editing} placeholder="github.com/…" />
            </div>
          </SectionCard>

          {/* Skills / Expertise (editable, role-aware) */}
          {(isTrainee || isTrainer) && (
            <SectionCard
              title={isTrainer ? "Areas of Expertise" : "Skills"}
              icon={isTrainer ? Briefcase : GraduationCap}
            >
              {isTrainer ? (
                <TagEditor
                  tags={form.expertise}
                  editing={editing}
                  accent="blue"
                  onAdd={(t) => setForm((f) => ({ ...f, expertise: [...f.expertise, t] }))}
                  onRemove={(t) => setForm((f) => ({ ...f, expertise: f.expertise.filter((x) => x !== t) }))}
                />
              ) : (
                <TagEditor
                  tags={form.skills}
                  editing={editing}
                  accent="violet"
                  onAdd={(t) => setForm((f) => ({ ...f, skills: [...f.skills, t] }))}
                  onRemove={(t) => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== t) }))}
                />
              )}
            </SectionCard>
          )}

          {/* Placement (read-only, trainee only) */}
          {isTrainee && (
            <SectionCard title="Placement" icon={Briefcase} locked>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <ReadOnlyRow icon={GraduationCap} label="Batch">
                  {user.batchId || "—"}
                </ReadOnlyRow>
                <ReadOnlyRow label="Status">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      PLACEMENT_STYLE[user.placementStatus] || PLACEMENT_STYLE.enrolled
                    }`}
                  >
                    {(user.placementStatus || "enrolled").replace(/_/g, " ")}
                  </span>
                </ReadOnlyRow>
                {user.companyName && (
                  <ReadOnlyRow icon={Building2} label="Company">
                    {user.companyName}
                  </ReadOnlyRow>
                )}
                {user.ctc && (
                  <ReadOnlyRow icon={BadgeIndianRupee} label="CTC">
                    {user.ctc}
                  </ReadOnlyRow>
                )}
                {user.placementNote && (
                  <div className="sm:col-span-2">
                    <ReadOnlyRow label="Note">{user.placementNote}</ReadOnlyRow>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* HR evaluation (read-only) */}
          {isTrainee && hr && (
            <SectionCard title="HR Evaluation" icon={Star} locked>
              <div className="mb-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-lg font-bold text-indigo-600 shadow-sm">
                  {hr.overallScore ?? "—"}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Overall score
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {hr.overallScore >= 80 ? "Excellent" : hr.overallScore >= 60 ? "Good" : "Needs work"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ScoreBar label="Communication" value={hr.communication ?? 0} />
                <ScoreBar label="Technical" value={hr.technical ?? 0} />
                <ScoreBar label="Confidence" value={hr.confidence ?? 0} />
              </div>
              {hr.recommendation && (
                <p className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">Recommendation: </span>
                  {hr.recommendation}
                </p>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Sticky action bar (mobile) ───────────────────────── */}
      {editing && (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-3xl gap-2">
            <button
              onClick={cancel}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {/* Floating edit button (mobile, view mode) */}
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="fixed bottom-5 right-5 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg sm:hidden"
        >
          <Pencil className="h-4 w-4" /> Edit
        </button>
      )}
    </div>
  );
}