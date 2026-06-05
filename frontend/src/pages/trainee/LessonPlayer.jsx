// src/features/trainee/LessonPlayer.jsx
// Route: coursess/:courseId/segment/:segmentId/:topicId/:lessonId  (lessonId = 's1'|'s2'|'s3'|'s4')
// Renders one session's content as readable "pages", with prev/next across the
// subject's live sessions, then a hand-off to the next subject.

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourseById, selectCurrentCourse, selectCourseDetailStatus } from "../../features/admin/courseSlice";
import {
  COLORS, hrs, urls, SESSION_DEFS, findSubject, subjectStatusKey,
  availableSessions, sessionHours, sessionContent, splitItems,
  useSubjectContent, StatusGlyph, navCss,
} from "../../features/trainee/courseNav";

const C = COLORS;

export default function LessonPlayer() {
  const { courseId, segmentId, topicId, lessonId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const course = useSelector(selectCurrentCourse);
  const status = useSelector(selectCourseDetailStatus);
  const { content, loading } = useSubjectContent(courseId, topicId);

  useEffect(() => {
    if (!course || String(course._id) !== String(courseId)) dispatch(fetchCourseById(courseId));
  }, [courseId, course, dispatch]);

  // keep the reading pane scrolled to top when switching sessions
  useEffect(() => { window.scrollTo({ top: 0 }); }, [lessonId]);

  if ((status === "loading" || status === "idle") && (!course || String(course._id) !== String(courseId)))
    return <div style={S.page}><div style={S.center}>Loading…</div></div>;

  const { month, subject } = findSubject(course, segmentId, topicId);
  if (!subject) return <div style={S.page}><div style={S.center}>Subject not found.</div></div>;

  const def = SESSION_DEFS.find((d) => d.key === lessonId);
  if (!def) return <div style={S.page}><div style={S.center}>Lesson not found.</div></div>;

  const sessions = availableSessions(subject, content);
  const idx = sessions.findIndex((d) => d.key === def.key);
  const prev = idx > 0 ? sessions[idx - 1] : null;
  const next = idx >= 0 && idx < sessions.length - 1 ? sessions[idx + 1] : null;
  const sk = subjectStatusKey(subject);

  // next subject in the same month (for the end-of-subject hand-off)
  const monthSubs = month?.subjects || [];
  const sIdx = monthSubs.findIndex((s) => String(s._id) === String(topicId));
  const nextSubject = sIdx >= 0 && sIdx < monthSubs.length - 1 ? monthSubs[sIdx + 1] : null;

  const text = sessionContent(content, def);
  const items = def.list ? splitItems(text) : [];

  return (
    <div style={S.page}>
      <style>{navCss}</style>
      <div style={S.wrap}>
        <div style={S.crumb}>
          <button style={S.crumbBtn} onClick={() => navigate(urls.segment(courseId, segmentId))}>{month?.name}</button>
          <span style={S.sep}>/</span>
          <button style={S.crumbBtn} onClick={() => navigate(urls.topic(courseId, segmentId, topicId))}>{subject.name}</button>
        </div>

        {/* session tabs */}
        <div style={S.tabs}>
          {sessions.map((d) => (
            <button key={d.key}
              style={{ ...S.tab, ...(d.key === def.key ? S.tabActive : {}) }}
              onClick={() => navigate(urls.lesson(courseId, segmentId, topicId, d.key))}>
              {d.tag} · {d.label}
            </button>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.head}>
            <span style={S.sTag}>{def.tag}</span>
            <h1 style={S.title}>{def.label}</h1>
            <span style={S.hrs}>{hrs(sessionHours(subject, def))}</span>
          </div>

          <div style={S.body}>
            {loading ? (
              <p style={S.muted}>Loading content…</p>
            ) : def.list ? (
              items.length ? (
                items.map((item, i) => (
                  <div key={i} style={S.lesson}>
                    <span style={{ display: "inline-flex", flexShrink: 0, marginTop: 2 }}>
                      <StatusGlyph status={sk === "completed" ? "completed" : "todo"} size={18} />
                    </span>
                    <span style={S.lessonText}>{item}</span>
                  </div>
                ))
              ) : <p style={S.muted}>No content yet. Run the content backfill or add it from the admin editor.</p>
            ) : def.key === "s3" ? (
              <div style={S.assignBox}>
                <div style={S.assignLabel}>Assignment task</div>
                <p style={S.assignText}>{text || "No assignment set."}</p>
              </div>
            ) : (
              <p style={S.muted}>Score &amp; remarks are recorded by the trainer at the end of the subject.</p>
            )}
          </div>

          {/* footer nav */}
          <div style={S.nav}>
            <button style={{ ...S.navBtn, visibility: prev ? "visible" : "hidden" }}
              onClick={() => prev && navigate(urls.lesson(courseId, segmentId, topicId, prev.key))}>
              ‹ {prev?.label}
            </button>

            {next ? (
              <button style={S.navPrimary}
                onClick={() => navigate(urls.lesson(courseId, segmentId, topicId, next.key))}>
                {next.label} ›
              </button>
            ) : nextSubject ? (
              <button style={S.navPrimary}
                onClick={() => navigate(urls.topic(courseId, segmentId, nextSubject._id))}>
                Next: {nextSubject.name} ›
              </button>
            ) : (
              <button style={S.navPrimary} onClick={() => navigate(urls.segment(courseId, segmentId))}>
                Back to {month?.name} ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: C.PAGE, color: C.INK, padding: "28px 20px",
    fontFamily: '"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
  wrap: { maxWidth: 820, margin: "0 auto" },
  center: { textAlign: "center", color: C.MUTED, marginTop: 80, fontSize: 16 },
  crumb: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 },
  crumbBtn: { background: "none", border: "none", color: C.MUTED, fontWeight: 600, cursor: "pointer", padding: 0 },
  sep: { color: "#cbd2da" },
  tabs: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: { background: "#fff", border: "1px solid #e3e7ec", color: "#5a6573", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  tabActive: { background: C.NAVY, color: "#fff", borderColor: C.NAVY },
  card: { background: "#fff", borderRadius: 16, padding: "26px 30px", boxShadow: "0 1px 3px rgba(16,24,40,.06)" },
  head: { display: "flex", alignItems: "center", gap: 12, paddingBottom: 18, borderBottom: "1px solid #eef0f3" },
  sTag: { fontSize: 12, fontWeight: 800, color: "#fff", background: C.NAVY, borderRadius: 6, padding: "3px 9px" },
  title: { fontSize: 22, fontWeight: 800, margin: 0, flex: 1 },
  hrs: { fontSize: 13, color: C.MUTED },
  body: { padding: "18px 0", minHeight: 160 },
  muted: { fontSize: 14.5, color: C.MUTED, lineHeight: 1.6 },
  lesson: { display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 0", borderBottom: "1px solid #f4f6f8" },
  lessonText: { fontSize: 15, color: "#3b4654", lineHeight: 1.6 },
  assignBox: { background: "#f7f8fa", borderRadius: 12, padding: "18px 20px" },
  assignLabel: { fontSize: 12, fontWeight: 700, color: C.MUTED, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 },
  assignText: { fontSize: 15, color: "#3b4654", lineHeight: 1.6, margin: 0 },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 18, borderTop: "1px solid #eef0f3" },
  navBtn: { background: "none", border: "none", color: C.MUTED, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  navPrimary: { background: C.GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 14.5, fontWeight: 700, cursor: "pointer" },
};