// src/features/trainee/CourseSegment.jsx
//
// Route (nested under /trainee):
//   <Route path="coursess/:courseId/segment/:segmentId" element={<CourseSegment />} />
//
// Opened when a trainee clicks a lesson row in Trainee_CourseDetail.
//   segmentId   = the subject's _id
//   ?session=S1 = which session block (S1 Theory / S2 Practical / S3 Assignment / S4 Feedback)
//   ?i=2        = which lesson item inside that session to highlight
//
// API integration: reuses the existing course API (fetchCourseById → selectCurrentCourse).
// The full course is loaded once, then we locate the subject by id on the client. This
// works on a fresh deep-link / refresh because we dispatch the fetch if the store is empty.

import React, { useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCourseById,
  selectCurrentCourse,
  selectCourseDetailStatus,
  selectCourseDetailError,
} from "../../features/admin/courseSlice";

/* ── helpers (kept local so this file is self-contained) ─────────────────── */

const norm = (s) => (s || "").toString().trim().toLowerCase();

const fmtDur = (hours) => {
  const totalMin = Math.round((Number(hours) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const splitItems = (text) =>
  (text || "")
    .split(/\r?\n|,|·|;/)
    .map((x) => x.trim())
    .filter(Boolean);

const SESSIONS = [
  { tag: "S1", label: "Theory", hk: "s1Theory", field: "theoryContent", list: true },
  { tag: "S2", label: "Practical", hk: "s2Practical", field: "practicalActivity", list: true },
  { tag: "S3", label: "Assignment", hk: "s3Assignment", field: "assignmentTask", list: false },
  { tag: "S4", label: "Feedback / Score", hk: "s4Feedback", field: null, list: false },
];

// Flatten the course into an ordered list of subjects with their context.
function indexSubjects(course) {
  const out = [];
  (course?.trimesters || []).forEach((t) =>
    (t.months || []).forEach((m) =>
      (m.subjects || []).forEach((s) => out.push({ subject: s, month: m, trimester: t }))
    )
  );
  return out;
}

/* ── component ───────────────────────────────────────────────────────────── */

const CourseSegment = () => {
  // Support either param name (:courseId here, or :id if reused elsewhere)
  const params = useParams();
  const courseId = params.courseId || params.id;
  const segmentId = params.segmentId;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useSearchParams();

  const course = useSelector(selectCurrentCourse);
  const status = useSelector(selectCourseDetailStatus);
  const error = useSelector(selectCourseDetailError);

  const activeTag = (search.get("session") || "S1").toUpperCase();
  const itemIndex = Number(search.get("i") || 0);

  // Load the course if it isn't already the one in the store.
  useEffect(() => {
    if (!courseId) return;
    if (!course || String(course._id) !== String(courseId)) {
      dispatch(fetchCourseById(courseId));
    }
  }, [courseId, course, dispatch]);

  // Locate this subject + its neighbours for prev/next navigation.
  const flat = useMemo(() => indexSubjects(course), [course]);
  const pos = useMemo(
    () => flat.findIndex((x) => String(x.subject?._id) === String(segmentId)),
    [flat, segmentId]
  );
  const entry = pos >= 0 ? flat[pos] : null;
  const prev = pos > 0 ? flat[pos - 1] : null;
  const next = pos >= 0 && pos < flat.length - 1 ? flat[pos + 1] : null;

  const def = SESSIONS.find((d) => d.tag === activeTag) || SESSIONS[0];
  const lessons = entry && def.field ? splitItems(entry.subject[def.field]) : [];

  const setSession = (tag) => setSearch({ session: tag, i: "0" });
  const setItem = (i) => setSearch({ session: activeTag, i: String(i) });

  /* ── loading / error / not-found states ── */
  if (status === "loading" || status === "idle")
    return <div style={S.page}><div style={S.center}>Loading lesson…</div></div>;

  if (status === "failed")
    return (
      <div style={S.page}><div style={S.center}>
        <p style={S.errTitle}>Couldn’t load this lesson</p>
        <p style={S.errSub}>{error || "Something went wrong."}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={S.ghostBtn} onClick={() => navigate(-1)}>Back</button>
          <button style={S.primaryBtn} onClick={() => dispatch(fetchCourseById(courseId))}>Retry</button>
        </div>
      </div></div>
    );

  if (!entry)
    return (
      <div style={S.page}><div style={S.center}>
        <p style={S.errTitle}>Lesson not found</p>
        <button style={S.primaryBtn} onClick={() => navigate(`/trainee/coursess/${courseId}`)}>
          Back to course
        </button>
      </div></div>
    );

  const { subject, month, trimester } = entry;
  const hrs = subject?.hours?.[def.hk] || 0;
  const completed = norm(subject.status) === "completed";

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={S.wrap}>
        {/* breadcrumb */}
        <button style={S.back} onClick={() => navigate(`/trainee/coursess/${courseId}`)}>
          ← {course?.name || "Back to course"}
        </button>
        <div style={S.crumb}>
          <span>{trimester?.title || `Trimester ${trimester?.trimesterNumber || ""}`}</span>
          <span style={S.crumbDot}>›</span>
          <span>{month?.name || "Month"}</span>
          <span style={S.crumbDot}>›</span>
          <span style={{ color: "#16202b", fontWeight: 700 }}>{subject?.name}</span>
        </div>

        <h1 style={S.title}>{subject?.name}</h1>
        {subject?.category && <span style={S.catBadge}>{subject.category}</span>}

        {/* session tabs */}
        <div style={S.tabs}>
          {SESSIONS.map((d) => {
            const dh = subject?.hours?.[d.hk] || 0;
            const has = d.field ? Boolean(subject?.[d.field]) || dh > 0 : true;
            if (!has) return null;
            const on = d.tag === activeTag;
            return (
              <button
                key={d.tag}
                className="cs-tab"
                style={{ ...S.tab, ...(on ? S.tabOn : null) }}
                onClick={() => setSession(d.tag)}
              >
                <span style={S.tabTag}>{d.tag}</span> {d.label}
              </button>
            );
          })}
        </div>

        {/* body card */}
        <div style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>{def.label}</h2>
            <span style={S.cardHrs}>{fmtDur(hrs)}</span>
          </div>

          {def.list ? (
            lessons.length ? (
              <ol style={S.lessonList}>
                {lessons.map((item, i) => (
                  <li
                    key={i}
                    className="cs-lesson"
                    style={{ ...S.lessonRow, ...(i === itemIndex ? S.lessonActive : null) }}
                    onClick={() => setItem(i)}
                  >
                    <span style={S.lessonNum}>{i + 1}</span>
                    <span style={S.lessonText}>{item}</span>
                    {completed && <span style={S.doneTag}>Completed</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p style={S.empty}>No content added for this session yet.</p>
            )
          ) : def.tag === "S3" ? (
            <div style={S.assignment}>
              <p style={S.assignText}>{subject?.assignmentTask || "No assignment set for this subject."}</p>
            </div>
          ) : (
            <p style={S.empty}>
              Score &amp; remarks are recorded by the trainer at the end of the subject.
            </p>
          )}
        </div>

        {/* prev / next subject */}
        <div style={S.nav}>
          <button
            style={{ ...S.navBtn, visibility: prev ? "visible" : "hidden" }}
            onClick={() => prev && navigate(`/trainee/coursess/${courseId}/segment/${prev.subject._id}?session=S1&i=0`)}
          >
            ← {prev?.subject?.name || ""}
          </button>
          <button
            style={{ ...S.navBtn, visibility: next ? "visible" : "hidden" }}
            onClick={() => next && navigate(`/trainee/coursess/${courseId}/segment/${next.subject._id}?session=S1&i=0`)}
          >
            {next?.subject?.name || ""} →
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── styles ──────────────────────────────────────────────────────────────── */
const INK = "#16202b", MUTED = "#98a2b3", NAVY = "#37404c", GREEN = "#16a37b";
const S = {
  page: { minHeight: "100vh", background: "#f3f4f6", color: INK, padding: "28px 20px", boxSizing: "border-box",
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  wrap: { maxWidth: 860, margin: "0 auto" },
  center: { maxWidth: 480, margin: "80px auto", textAlign: "center", color: MUTED, fontSize: 16 },
  errTitle: { fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 6px" },
  errSub: { fontSize: 14, color: MUTED, margin: "0 0 18px" },

  back: { background: "none", border: "none", color: MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 },
  crumb: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13, color: MUTED, marginBottom: 10 },
  crumbDot: { color: "#cbd2da" },
  title: { fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 8px" },
  catBadge: { display: "inline-block", fontSize: 11.5, fontWeight: 600, color: "#6b7686", background: "#e9ecf1", borderRadius: 6, padding: "3px 10px" },

  tabs: { display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 16px" },
  tab: { display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #dfe3e8", background: "#fff",
    color: "#5a6573", fontSize: 13.5, fontWeight: 600, padding: "8px 14px", borderRadius: 999, cursor: "pointer" },
  tabOn: { background: NAVY, color: "#fff", borderColor: NAVY },
  tabTag: { fontSize: 11, fontWeight: 800, opacity: 0.85 },

  card: { background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(16,24,40,.06)", padding: "20px 22px" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: 800, margin: 0 },
  cardHrs: { fontSize: 13, color: MUTED, fontWeight: 600 },

  lessonList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 },
  lessonRow: { display: "flex", alignItems: "center", gap: 14, padding: "12px 12px", borderRadius: 10, cursor: "pointer",
    border: "1px solid transparent" },
  lessonActive: { background: "#eef6f2", border: "1px solid #bfe3d3" },
  lessonNum: { width: 24, height: 24, flexShrink: 0, borderRadius: 999, background: "#eef0f3", color: "#5a6573",
    fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  lessonText: { fontSize: 14.5, color: "#3b4654", lineHeight: 1.5, flex: 1 },
  doneTag: { fontSize: 11, fontWeight: 700, color: GREEN, background: "#e6f5ef", borderRadius: 6, padding: "2px 8px" },

  assignment: { background: "#fafbfc", borderRadius: 10, padding: "16px 16px" },
  assignText: { fontSize: 14.5, color: "#3b4654", lineHeight: 1.6, margin: 0 },
  empty: { fontSize: 14, color: MUTED, fontStyle: "italic", margin: 0 },

  nav: { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18 },
  navBtn: { maxWidth: "48%", border: "1px solid #d7dce2", background: "#fff", color: INK, fontSize: 13.5, fontWeight: 600,
    padding: "10px 16px", borderRadius: 10, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  primaryBtn: { border: "none", background: NAVY, color: "#fff", fontSize: 14, fontWeight: 600, padding: "9px 22px", borderRadius: 8, cursor: "pointer" },
  ghostBtn: { border: "1px solid #d7dce2", background: "#fff", color: INK, fontSize: 14, fontWeight: 600, padding: "9px 22px", borderRadius: 8, cursor: "pointer" },
};
const css = `
  .cs-tab:hover{background:#f2f4f7;}
  .cs-tab[style*="background: rgb(55, 64, 76)"]:hover{background:#2d353f;}
  .cs-lesson:hover{background:#f7f8fa;}
`;

export default CourseSegment;