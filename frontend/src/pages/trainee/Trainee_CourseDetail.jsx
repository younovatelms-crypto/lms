// src/features/trainee/Trainee_CourseDetail.jsx
//
// Route (nested under /trainee):  coursess/:id   →  /trainee/coursess/:id
//   <Route path="coursess/:id" element={<Trainee_CourseDetail />} />
//
// upGrad-style curriculum accordion:
//   Course → Trimesters → Months("Module" rows) → Subjects("Page" rows)
//            → S1 Theory / S2 Practical / S3 Assignment / S4 Feedback (lesson rows)
//
//   • Click a MONTH row (the whole div) → expands its subjects.
//   • Click a SUBJECT row (the whole div) → expands its S1..S4 sessions.
//   • Each row shows a lock icon when "Not Started", a check when "Completed",
//     and a play glyph when "In Progress".
//
// Progress is hours-weighted from subject.status:
//   Completed = 100% of its hours, In Progress = 50%, Not Started = 0%.

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCourseById,
  selectCurrentCourse,
  selectCourseDetailStatus,
  selectCourseDetailError,
} from "../../features/admin/courseSlice";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const norm = (s) => (s || "").toString().trim().toLowerCase();

// "5h 35m"  /  "5h"  /  "35m"  — matches the upGrad duration label
const fmtDur = (hours) => {
  const totalMin = Math.round((Number(hours) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const subjectHours = (s) => {
  const h = s?.hours || {};
  if (h.total != null) return Number(h.total) || 0;
  return ["s1Theory", "s2Practical", "s3Assignment", "s4Feedback"]
    .reduce((sum, k) => sum + (Number(h[k]) || 0), 0);
};

const subjectFraction = (s) => {
  const st = norm(s?.status);
  if (st === "completed") return 1;
  if (st === "in progress") return 0.5;
  return 0;
};

// hours-weighted roll-up over a flat list of subjects
const rollup = (subjects = []) => {
  let total = 0, done = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, complete = 0;
  subjects.forEach((s) => {
    const h = subjectHours(s);
    total += h;
    done += h * subjectFraction(s);
    if (norm(s.status) === "completed") complete += 1;
    const hh = s.hours || {};
    s1 += Number(hh.s1Theory) || 0;
    s2 += Number(hh.s2Practical) || 0;
    s3 += Number(hh.s3Assignment) || 0;
    s4 += Number(hh.s4Feedback) || 0;
  });
  return {
    total, done, s1, s2, s3, s4, complete,
    count: subjects.length,
    pct: total ? clampPct((done / total) * 100) : 0,
  };
};

const monthSubjects = (m) => m?.subjects || [];
const trimesterSubjects = (t) => (t?.months || []).flatMap(monthSubjects);
const courseSubjects = (c) => (c?.trimesters || []).flatMap(trimesterSubjects);

const statusFromPct = (pct) => (pct >= 100 ? "completed" : pct > 0 ? "current" : "todo");

// map a subject.status string to a row state
const rowState = (status) =>
  norm(status) === "completed" ? "completed" : norm(status) === "in progress" ? "current" : "todo";

// content fields are comma / newline / · separated lists → split into lesson rows
const splitItems = (text) =>
  (text || "")
    .split(/\r?\n|,|·|;/)
    .map((x) => x.trim())
    .filter(Boolean);

/* ── icons ───────────────────────────────────────────────────────────────── */

const Check = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="#16a37b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlayC = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#16a37b" /><path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" />
  </svg>
);
// the "locked" padlock used for not-started rows (like the screenshot)
const Lock = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="#b6bdc7" strokeWidth="1.6" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#b6bdc7" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const Chevron = ({ open }) => (
  <svg className="cd-chev" style={{ transform: open ? "rotate(180deg)" : "none" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="#98a2b3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// right-edge glyph per row state
const RowGlyph = ({ state, size = 18 }) =>
  state === "completed" ? <Check s={size} /> : state === "current" ? <PlayC s={size} /> : <Lock s={size} />;

// the +/− toggle on a module row (− when open, like the screenshot)
const Toggle = ({ open }) => (
  <span style={styles.toggle} aria-hidden>{open ? "−" : "+"}</span>
);

/* ── session block (S1..S4) ─────────────────────────────────────────────── */

const SESSIONS = [
  { tag: "S1", label: "Theory", hk: "s1Theory", field: "theoryContent", list: true },
  { tag: "S2", label: "Practical", hk: "s2Practical", field: "practicalActivity", list: true },
  { tag: "S3", label: "Assignment", hk: "s3Assignment", field: "assignmentTask", list: false },
  { tag: "S4", label: "Feedback / Score", hk: "s4Feedback", field: null, list: false },
];

const SessionBlock = ({ subject, def }) => {
  const h = subject?.hours?.[def.hk] || 0;
  const content = def.field ? subject?.[def.field] : null;
  if (def.field && !content && h === 0) return null;

  const state = rowState(subject.status);

  return (
    <div style={styles.session}>
      <div style={styles.sessionHead}>
        <span style={styles.sessionTag}>{def.tag}</span>
        <span style={styles.sessionLabel}>{def.label}</span>
        <span style={styles.sessionHrs}>{fmtDur(h)}</span>
      </div>

      {def.list ? (
        <div>
          {splitItems(content).map((item, i) => (
            <div key={i} className="cd-row" style={styles.lessonRow}>
              <span style={styles.lessonText}>{item}</span>
              <span style={styles.glyphSlot}><RowGlyph state={state} size={18} /></span>
            </div>
          ))}
          {splitItems(content).length === 0 && <div style={styles.lessonEmpty}>No content yet.</div>}
        </div>
      ) : def.tag === "S3" ? (
        <div style={styles.assignment}>
          <span style={styles.assignText}>{content || "No assignment set."}</span>
          <span style={styles.glyphSlot}><RowGlyph state={state} size={18} /></span>
        </div>
      ) : (
        <div style={styles.feedback}>Score &amp; remarks recorded by the trainer at the end of the subject.</div>
      )}
    </div>
  );
};

/* ── subject ("Page") row — expands on whole-div click ──────────────────── */

const SubjectRow = ({ subject }) => {
  const [open, setOpen] = useState(false);
  const total = subjectHours(subject);
  const state = rowState(subject.status);
  const toggle = () => setOpen((o) => !o);

  return (
    <div style={styles.subjectWrap}>
      <div
        className="cd-page-row"
        style={styles.pageRow}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.pageTitle}>{subject.name}</div>
          {subject.category && <span style={styles.catBadge}>{subject.category}</span>}
        </div>
        <span style={styles.pageHrs}>{fmtDur(total)}</span>
        <span style={styles.glyphSlot}><RowGlyph state={state} size={18} /></span>
        <Toggle open={open} />
      </div>

      {open && (
        <div className="cd-expand" style={styles.sessionList}>
          {SESSIONS.map((def) => <SessionBlock key={def.tag} subject={subject} def={def} />)}
        </div>
      )}
    </div>
  );
};

/* ── month ("Module") accordion section — expands on whole-div click ────── */

const MonthCard = ({ trimesterNum, month, idx, open, onToggle }) => {
  const subs = monthSubjects(month);
  const r = rollup(subs);
  const st = statusFromPct(r.pct);
  const mNum = month.monthNumber ?? idx + 1;
  const pageWord = r.count === 1 ? "Page" : "Pages";

  return (
    <section id={`m-${trimesterNum}-${mNum}`} style={styles.moduleWrap}>
      <div
        className={`cd-module-head ${open ? "is-open" : ""}`}
        style={{ ...styles.moduleHead, ...(open ? styles.moduleHeadOpen : null) }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      >
        <div style={styles.moduleHeadLeft}>
          <h2 style={styles.moduleTitle}>{month.name || `Month ${mNum}`}</h2>
          <div style={styles.moduleSub}>
            Month {mNum}{month.code ? ` · ${month.code}` : ""}
            {st === "completed" && (
              <span style={styles.inlineCheck}><Check s={14} /></span>
            )}
          </div>
        </div>

        <div style={styles.moduleMeta}>
          <span style={styles.metaPages}>{r.count} {pageWord}</span>
          <span style={styles.metaDur}>{fmtDur(r.total)}</span>
          <Toggle open={open} />
        </div>
      </div>

      {/* slim progress strip under the header */}
      <div style={styles.moduleProg}>
        <div style={styles.track}><div className="cd-fill" style={{ ...styles.fill, width: `${r.pct}%` }} /></div>
        <span style={styles.moduleProgPct}>{r.pct}%</span>
      </div>

      {open && (
        <div className="cd-expand" style={styles.pageList}>
          {subs.map((s, i) => <SubjectRow key={s._id || i} subject={s} />)}
          {subs.length === 0 && <div style={styles.lessonEmpty}>No subjects added to this month.</div>}

          <div style={styles.monthTotal}>
            <span style={styles.monthTotalName}>Month {mNum} Total — {month.name}</span>
            <span style={styles.monthTotalHrs}>
              {fmtDur(r.total)} &nbsp;·&nbsp; S1 {r.s1} · S2 {r.s2} · S3 {r.s3} · S4 {r.s4}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

/* ── page ────────────────────────────────────────────────────────────────── */

const Trainee_CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const course = useSelector(selectCurrentCourse);
  const status = useSelector(selectCourseDetailStatus);
  const error = useSelector(selectCourseDetailError);

  const [openMonth, setOpenMonth] = useState(null); // key: `${tNum}-${mNum}`

  useEffect(() => { if (id) dispatch(fetchCourseById(id)); }, [id, dispatch]);

  const trimesters = useMemo(() => course?.trimesters || [], [course]);

  // open the first not-yet-complete month by default
  useEffect(() => {
    if (!trimesters.length) return;
    for (const t of trimesters) {
      for (let i = 0; i < (t.months || []).length; i++) {
        const m = t.months[i];
        if (rollup(monthSubjects(m)).pct < 100) {
          setOpenMonth(`${t.trimesterNumber}-${m.monthNumber ?? i + 1}`);
          return;
        }
      }
    }
    const t0 = trimesters[0]; const m0 = t0.months?.[0];
    if (m0) setOpenMonth(`${t0.trimesterNumber}-${m0.monthNumber ?? 1}`);
  }, [trimesters]);

  if (status === "loading" || status === "idle")
    return <div style={styles.page}><div style={styles.center}>Loading course…</div></div>;

  if (status === "failed")
    return (
      <div style={styles.page}><div style={styles.center}>
        <p style={styles.errTitle}>Couldn’t load this course</p>
        <p style={styles.errSub}>{error || "Something went wrong."}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={styles.ghostBtn} onClick={() => navigate(-1)}>Back</button>
          <button style={styles.primaryBtn} onClick={() => dispatch(fetchCourseById(id))}>Retry</button>
        </div>
      </div></div>
    );

  if (!course)
    return <div style={styles.page}><div style={styles.center}>Course not found.</div></div>;

  const cr = rollup(courseSubjects(course));

  const goToMonth = (tNum, mNum) => {
    setOpenMonth(`${tNum}-${mNum}`);
    const el = document.getElementById(`m-${tNum}-${mNum}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>
      <div className="cd-grid" style={styles.grid}>
        {/* sidebar */}
        <aside style={styles.sidebar}>
          <button style={styles.back} onClick={() => navigate(-1)}>← All courses</button>
          <div style={styles.coursePill}>
            <span>{course.code}</span><span style={{ color: "#98a2b3" }}>•</span>
            <span style={{ textTransform: "capitalize" }}>{course.level}</span>
          </div>
          <h1 style={styles.courseTitle}>{course.name}</h1>
          <div style={styles.progSummary}>
            <span style={styles.progPctBig}>{cr.pct}% Complete</span>
            <span style={styles.progMeta}>{fmtDur(cr.total)} total</span>
          </div>
          <div style={styles.sideTrack}><div className="cd-fill" style={{ ...styles.sideFill, width: `${cr.pct}%` }} /></div>

          <p className="cd-label" style={styles.overviewLabel}>Curriculum</p>
          {trimesters.map((t, ti) => {
            const tr = rollup(trimesterSubjects(t));
            return (
              <div key={t._id || ti} style={{ marginBottom: 14 }}>
                <div style={styles.triHead}>
                  <span style={styles.triHeadTitle}>{t.code ? `${t.code} · ` : ""}{t.title}</span>
                  <span style={styles.triHeadPct}>{tr.pct}%</span>
                </div>
                {(t.months || []).map((m, mi) => {
                  const mr = rollup(monthSubjects(m));
                  const mst = statusFromPct(mr.pct);
                  const mNum = m.monthNumber ?? mi + 1;
                  return (
                    <div key={m._id || mi} className="cd-side-item" style={styles.sideItem}
                      onClick={() => goToMonth(t.trimesterNumber, mNum)}>
                      <span style={styles.sideIcon}><RowGlyph state={mst} size={16} /></span>
                      <span style={{ flex: 1 }}>
                        <span style={styles.sideItemTitle}>{m.name}</span>
                        <span style={styles.sideItemSub}>{mr.pct}% · {fmtDur(mr.total)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* main — upGrad-style accordion */}
        <main style={styles.main}>
          {trimesters.map((t, ti) => {
            const tr = rollup(trimesterSubjects(t));
            return (
              <div key={t._id || ti}>
                <div style={styles.triSection}>
                  <div style={styles.triSectionTop}>
                    <span style={styles.triSectionTag}>Trimester {t.trimesterNumber}{t.code ? ` · ${t.code}` : ""}</span>
                    <span style={styles.triSectionPct}>{tr.pct}% · {fmtDur(tr.total)}</span>
                  </div>
                  <h2 style={styles.triSectionTitle}>{t.title}</h2>
                  {t.focus && <p style={styles.triSectionFocus}>{t.focus}</p>}
                </div>

                <div style={styles.accordion}>
                  {(t.months || []).map((m, mi) => {
                    const mNum = m.monthNumber ?? mi + 1;
                    const key = `${t.trimesterNumber}-${mNum}`;
                    return (
                      <MonthCard key={m._id || mi} trimesterNum={t.trimesterNumber} month={m} idx={mi}
                        open={openMonth === key}
                        onToggle={() => setOpenMonth(openMonth === key ? null : key)} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

/* ── styles ──────────────────────────────────────────────────────────────── */
const INK = "#16202b", MUTED = "#98a2b3", NAVY = "#37404c", GREEN = "#16a37b";
const styles = {
  page: { minHeight: "100vh", background: "#f3f4f6", color: INK, padding: "28px 20px", boxSizing: "border-box",
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  center: { maxWidth: 480, margin: "80px auto", textAlign: "center", color: MUTED, fontSize: 16 },
  errTitle: { fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 6px" },
  errSub: { fontSize: 14, color: MUTED, margin: "0 0 18px" },
  grid: { maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "320px 1fr", gap: 32, alignItems: "start" },

  sidebar: { position: "sticky", top: 28 },
  back: { background: "none", border: "none", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 14 },
  coursePill: { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", borderRadius: 999, padding: "6px 14px",
    fontSize: 13, fontWeight: 600, color: INK, boxShadow: "0 1px 3px rgba(16,24,40,.06)" },
  courseTitle: { fontSize: 28, fontWeight: 800, lineHeight: 1.15, margin: "16px 0 16px" },
  progSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progPctBig: { fontSize: 14, fontWeight: 600 }, progMeta: { fontSize: 13, color: MUTED },
  sideTrack: { height: 6, background: "#dfe3e8", borderRadius: 999, overflow: "hidden" },
  sideFill: { height: "100%", background: NAVY, borderRadius: 999 },
  overviewLabel: { fontSize: 12, fontWeight: 700, color: MUTED, margin: "26px 0 12px" },
  triHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px 6px" },
  triHeadTitle: { fontSize: 12.5, fontWeight: 700, color: "#5a6573", textTransform: "uppercase", letterSpacing: ".04em" },
  triHeadPct: { fontSize: 12, color: MUTED, fontWeight: 600 },
  sideItem: { display: "flex", alignItems: "center", gap: 11, padding: "9px 8px" },
  sideIcon: { width: 20, display: "inline-flex", justifyContent: "center" },
  sideItemTitle: { display: "block", fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.3 },
  sideItemSub: { display: "block", fontSize: 11.5, color: MUTED, marginTop: 2 },

  main: { display: "flex", flexDirection: "column", gap: 20 },
  triSection: { padding: "6px 2px 2px" },
  triSectionTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  triSectionTag: { fontSize: 12.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".05em" },
  triSectionPct: { fontSize: 13, color: MUTED, fontWeight: 600 },
  triSectionTitle: { fontSize: 22, fontWeight: 800, margin: "6px 0 4px" },
  triSectionFocus: { fontSize: 14, color: "#5a6573", lineHeight: 1.5, margin: 0 },

  // accordion shell — a single white card holding stacked module rows
  accordion: { background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(16,24,40,.06)", overflow: "hidden", marginTop: 10 },

  moduleWrap: { borderBottom: "1px solid #eef0f3" },

  // the clickable module header (whole div toggles)
  moduleHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    padding: "16px 20px", cursor: "pointer", borderRadius: 12, margin: 6,
    border: "1.5px solid transparent", transition: "background .15s ease, border-color .15s ease",
  },
  moduleHeadOpen: { background: "#fafbfc", border: "1.5px solid #e3e7ec" },
  moduleHeadLeft: { minWidth: 0 },
  moduleTitle: { fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.25, color: INK },
  moduleSub: { fontSize: 12.5, color: MUTED, marginTop: 3, display: "flex", alignItems: "center", gap: 6 },
  inlineCheck: { display: "inline-flex", verticalAlign: "middle" },
  moduleMeta: { display: "flex", alignItems: "center", gap: 18, flexShrink: 0 },
  metaPages: { fontSize: 13, color: MUTED },
  metaDur: { fontSize: 13, color: MUTED, minWidth: 56, textAlign: "right" },
  toggle: { fontSize: 20, color: "#b6bdc7", width: 16, textAlign: "center", lineHeight: 1, userSelect: "none" },

  moduleProg: { display: "flex", alignItems: "center", gap: 10, padding: "0 26px 14px" },
  moduleProgPct: { fontSize: 11.5, color: MUTED, fontWeight: 600, minWidth: 32, textAlign: "right" },
  track: { flex: 1, height: 6, background: "#e7eaee", borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", background: NAVY, borderRadius: 999 },

  // list of subject ("Page") rows under an open module
  pageList: { padding: "0 8px 12px" },
  subjectWrap: { borderTop: "1px solid #f1f3f5" },
  pageRow: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 8 },
  pageTitle: { fontSize: 14.5, fontWeight: 500, color: "#3b4654", lineHeight: 1.3 },
  catBadge: { display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, color: "#6b7686", background: "#f1f3f5", borderRadius: 6, padding: "2px 8px" },
  pageHrs: { fontSize: 13, color: MUTED, flexShrink: 0 },
  glyphSlot: { display: "inline-flex", flexShrink: 0, width: 22, justifyContent: "center" },

  sessionList: { paddingLeft: 34, paddingBottom: 10 },
  session: { padding: "12px 0", borderTop: "1px dashed #eef0f3" },
  sessionHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  sessionTag: { fontSize: 11, fontWeight: 800, color: "#fff", background: NAVY, borderRadius: 6, padding: "2px 7px" },
  sessionLabel: { fontSize: 14, fontWeight: 700, color: INK },
  sessionHrs: { fontSize: 12.5, color: MUTED, marginLeft: "auto" },
  lessonRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "9px 8px", borderRadius: 8 },
  lessonText: { fontSize: 14, color: "#3b4654", lineHeight: 1.5 },
  lessonEmpty: { fontSize: 13, color: MUTED, padding: "10px 8px" },
  assignment: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, padding: "9px 8px", background: "#fafbfc", borderRadius: 8 },
  assignText: { fontSize: 14, color: "#3b4654", lineHeight: 1.5 },
  feedback: { fontSize: 13.5, color: MUTED, fontStyle: "italic", padding: "6px 8px" },

  monthTotal: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
    marginTop: 8, padding: "14px 14px", background: "#f7f8fa", borderRadius: 10 },
  monthTotalName: { fontSize: 13.5, fontWeight: 700, color: INK },
  monthTotalHrs: { fontSize: 12.5, color: MUTED, fontWeight: 600 },

  primaryBtn: { border: "none", background: NAVY, color: "#fff", fontSize: 14, fontWeight: 600, padding: "9px 22px", borderRadius: 8, cursor: "pointer" },
  ghostBtn: { border: "1px solid #d7dce2", background: "#fff", color: INK, fontSize: 14, fontWeight: 600, padding: "9px 22px", borderRadius: 8, cursor: "pointer" },
};
const css = `
  .cd-module-head:hover{background:#f7f8fa;}
  .cd-module-head.is-open:hover{background:#fafbfc;}
  .cd-page-row{transition:background .15s ease;cursor:pointer;}
  .cd-page-row:hover{background:#f7f8fa;}
  .cd-row{transition:background .15s ease;}
  .cd-row:hover{background:#f7f8fa;}
  .cd-side-item{cursor:pointer;border-radius:8px;transition:background .15s ease;}
  .cd-side-item:hover{background:#eceef1;}
  .cd-fill{transition:width .6s cubic-bezier(.4,0,.2,1);}
  .cd-chev{transition:transform .2s ease;}
  .cd-label{letter-spacing:.07em;}
  .cd-expand{animation:cd-slide .22s ease;}
  @keyframes cd-slide{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
  @media (max-width:860px){.cd-grid{grid-template-columns:1fr !important;}}
`;
export default Trainee_CourseDetail;