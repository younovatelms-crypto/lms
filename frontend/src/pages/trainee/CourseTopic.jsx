// src/features/trainee/CourseTopic.jsx
// Route: coursess/:courseId/segment/:segmentId/:topicId   (topicId = Subject _id)
// Shows one subject + its live sessions (S1/S2/S3/S4), each opening the LessonPlayer.

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourseById, selectCurrentCourse, selectCourseDetailStatus } from "../../features/admin/courseSlice";
import {
  COLORS, hrs, urls, findSubject, subjectStatusKey, subjectHours,
  availableSessions, sessionHours, sessionContent, splitItems,
  useSubjectContent, StatusGlyph, navCss,
} from "../../features/trainee/courseNav";

const C = COLORS;

export default function CourseTopic() {
  const { courseId, segmentId, topicId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const course = useSelector(selectCurrentCourse);
  const status = useSelector(selectCourseDetailStatus);
  const { content, loading } = useSubjectContent(courseId, topicId);

  useEffect(() => {
    if (!course || String(course._id) !== String(courseId)) dispatch(fetchCourseById(courseId));
  }, [courseId, course, dispatch]);

  if ((status === "loading" || status === "idle") && (!course || String(course._id) !== String(courseId)))
    return <div style={S.page}><div style={S.center}>Loading…</div></div>;

  const { month, subject } = findSubject(course, segmentId, topicId);
  if (!subject) return <div style={S.page}><div style={S.center}>Subject not found.</div></div>;

  const sessions = availableSessions(subject, content);
  const sk = subjectStatusKey(subject);

  return (
    <div style={S.page}>
      <style>{navCss}</style>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate(urls.segment(courseId, segmentId))}>← {month?.name}</button>

        <div style={S.card}>
          <div style={S.headRow}>
            <span style={S.icon}><StatusGlyph status={sk} size={22} /></span>
            <div style={{ flex: 1 }}>
              <h1 style={S.title}>{subject.name}</h1>
              <div style={S.sub}>
                {subject.category && <span style={S.cat}>{subject.category}</span>}
                <span style={S.hrs}>{hrs(subjectHours(subject))}</span>
                <span style={S.statusText}>{subject.status}</span>
              </div>
            </div>
          </div>

          <div style={S.sessionWrap}>
            {sessions.map((def) => {
              const items = def.list ? splitItems(sessionContent(content, def)) : [];
              const preview = def.list ? items[0] : (def.field ? sessionContent(content, def) : "Trainer-graded");
              return (
                <div key={def.key} className="cn-row" style={S.session}
                  onClick={() => navigate(urls.lesson(courseId, segmentId, topicId, def.key))}>
                  <span style={S.sTag}>{def.tag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.sLabel}>{def.label}</div>
                    <div style={S.sPreview}>
                      {loading ? "Loading…" : preview ? preview : "No content yet."}
                    </div>
                  </div>
                  <span style={S.sHrs}>{hrs(sessionHours(subject, def))}</span>
                  <span style={S.arrow}>›</span>
                </div>
              );
            })}
            {sessions.length === 0 && <div style={S.empty}>No sessions configured.</div>}
          </div>

          {sessions.length > 0 && (
            <button style={S.startBtn}
              onClick={() => navigate(urls.lesson(courseId, segmentId, topicId, sessions[0].key))}>
              Start ▸ {sessions[0].label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: C.PAGE, color: C.INK, padding: "28px 20px",
    fontFamily: '"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
  wrap: { maxWidth: 760, margin: "0 auto" },
  center: { textAlign: "center", color: C.MUTED, marginTop: 80, fontSize: 16 },
  back: { background: "none", border: "none", color: C.MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16 },
  card: { background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(16,24,40,.06)" },
  headRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  icon: { width: 26, display: "inline-flex", justifyContent: "center", flexShrink: 0, paddingTop: 4 },
  title: { fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1.2 },
  sub: { display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" },
  cat: { fontSize: 11, fontWeight: 600, color: "#6b7686", background: "#f1f3f5", borderRadius: 6, padding: "3px 9px" },
  hrs: { fontSize: 13, color: C.MUTED }, statusText: { fontSize: 13, fontWeight: 600, color: C.GREEN },
  sessionWrap: { marginTop: 22, borderTop: "1px solid #eef0f3", paddingTop: 6 },
  session: { display: "flex", alignItems: "center", gap: 13, padding: "15px 8px", borderBottom: "1px solid #f1f3f5", borderRadius: 8 },
  sTag: { fontSize: 11, fontWeight: 800, color: "#fff", background: C.NAVY, borderRadius: 6, padding: "3px 8px", flexShrink: 0 },
  sLabel: { fontSize: 15.5, fontWeight: 700 },
  sPreview: { fontSize: 13, color: C.MUTED, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sHrs: { fontSize: 13, color: C.MUTED, flexShrink: 0 },
  arrow: { color: "#cbd2da", fontSize: 22, lineHeight: 1, flexShrink: 0 },
  startBtn: { marginTop: 20, width: "100%", background: C.GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  empty: { padding: 24, textAlign: "center", color: C.MUTED },
};