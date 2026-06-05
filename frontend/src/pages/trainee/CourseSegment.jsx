// src/features/trainee/CourseSegment.jsx
// Route: coursess/:courseId/segment/:segmentId   (segmentId = Month _id)
// Shows one month + its list of subjects, each linking into the Subject (topic) page.

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourseById, selectCurrentCourse, selectCourseDetailStatus } from "../../features/admin/courseSlice";
import {
  COLORS, hrs, urls, findMonth, rollup, statusFromPct, subjectStatusKey, subjectHours,
  StatusGlyph, navCss,
} from "../../features/trainee/courseNav";

const C = COLORS;

export default function CourseSegment() {
  const { courseId, segmentId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const course = useSelector(selectCurrentCourse);
  const status = useSelector(selectCourseDetailStatus);

  useEffect(() => {
    if (!course || String(course._id) !== String(courseId)) dispatch(fetchCourseById(courseId));
  }, [courseId, course, dispatch]);

  if ((status === "loading" || status === "idle") && (!course || String(course._id) !== String(courseId)))
    return <div style={S.page}><div style={S.center}>Loading…</div></div>;

  const { trimester, month } = findMonth(course, segmentId);
  if (!month) return <div style={S.page}><div style={S.center}>Month not found.</div></div>;

  const subs = month.subjects || [];
  const r = rollup(subs);

  return (
    <div style={S.page}>
      <style>{navCss}</style>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate(urls.course(courseId))}>← {course.name}</button>

        <div style={S.head}>
          <div style={S.tag}>{trimester?.code ? `${trimester.code} · ` : ""}Month {month.monthNumber}{month.code ? ` · ${month.code}` : ""}</div>
          <h1 style={S.title}>{month.name}</h1>
          <div style={S.metaRow}>
            <span style={S.pct}>{r.pct}% Complete</span>
            <span style={S.meta}>{subs.length} subjects · {hrs(r.total)}</span>
          </div>
          <div style={S.track}><div className="cn-fill" style={{ ...S.fill, width: `${r.pct}%` }} /></div>
        </div>

        <div style={S.card}>
          {subs.map((s) => (
            <div key={s._id} className="cn-row" style={S.row}
              onClick={() => navigate(urls.topic(courseId, segmentId, s._id))}>
              <span style={S.icon}><StatusGlyph status={subjectStatusKey(s)} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.rowTitle}>{s.name}</div>
                {s.category && <span style={S.cat}>{s.category}</span>}
              </div>
              <span style={S.rowHrs}>{hrs(subjectHours(s))}</span>
              <span style={S.arrow}>›</span>
            </div>
          ))}
          {subs.length === 0 && <div style={S.empty}>No subjects in this month.</div>}
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
  head: { marginBottom: 22 },
  tag: { fontSize: 13, fontWeight: 600, color: C.MUTED, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, margin: "0 0 14px" },
  metaRow: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  pct: { fontSize: 14, fontWeight: 600 }, meta: { fontSize: 13, color: C.MUTED },
  track: { height: 7, background: "#e7eaee", borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", background: C.NAVY, borderRadius: 999 },
  card: { background: "#fff", borderRadius: 16, padding: "8px 20px", boxShadow: "0 1px 3px rgba(16,24,40,.06)" },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "16px 8px", borderBottom: "1px solid #f1f3f5", borderRadius: 8 },
  icon: { width: 24, display: "inline-flex", justifyContent: "center", flexShrink: 0 },
  rowTitle: { fontSize: 16, fontWeight: 600, lineHeight: 1.3 },
  cat: { display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 600, color: "#6b7686", background: "#f1f3f5", borderRadius: 6, padding: "2px 8px" },
  rowHrs: { fontSize: 13, color: C.MUTED, flexShrink: 0 },
  arrow: { color: "#cbd2da", fontSize: 22, lineHeight: 1, flexShrink: 0 },
  empty: { padding: 24, textAlign: "center", color: C.MUTED },
};