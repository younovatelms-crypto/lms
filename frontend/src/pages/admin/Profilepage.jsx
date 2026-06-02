// src/pages/admin/ProfilePage.jsx
//
// Connected container for the presentational <Profile /> component.
// Handles all API integration so Profile stays pure & reusable:
//   • pulls the current user / status / error from the auth slice
//   • rehydrates the user on mount if the store is empty (e.g. hard refresh)
//   • on save, sends ONLY changed fields to PUT /api/auth/profile
//   • surfaces success / error / no-change feedback via a lightweight toast
//
// Requires the corrected authSlice that exports the `updateProfile` thunk
// (the version with [ADD] updateProfile + selectors). The older slice that
// still does `localStorage.setItem('token', data.token)` and lacks
// updateProfile will NOT work here.

import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";

import Profile from "./Profile";
import {
  updateProfile,
  fetchCurrentUser,
  clearError,
  selectCurrentUser,
  selectAuthStatus,
  selectAuthError,
} from "../../features/auth/authSlice";

// Only these fields are user-editable (must match the server whitelist).
const EDITABLE = [
  "name",
  "phone",
  "bio",
  "profilePicture",
  "linkedIn",
  "github",
  "skills",
  "expertise",
];

// Build a minimal patch: just the fields that actually changed.
function buildPatch(form, user) {
  const patch = {};
  for (const key of EDITABLE) {
    const next = form[key];
    const prev = user?.[key];

    if (Array.isArray(next)) {
      const a = next ?? [];
      const b = prev ?? [];
      const changed = a.length !== b.length || a.some((v, i) => v !== b[i]);
      if (changed) patch[key] = a;
    } else if ((next ?? "") !== (prev ?? "")) {
      patch[key] = next;
    }
  }
  return patch;
}

/* ---------- tiny toast ---------------------------------------------- */

const TOAST_STYLE = {
  success: { icon: CheckCircle2, ring: "border-emerald-200", bg: "bg-emerald-50", fg: "text-emerald-700" },
  error:   { icon: AlertCircle,  ring: "border-rose-200",    bg: "bg-rose-50",    fg: "text-rose-700" },
  info:    { icon: Info,         ring: "border-slate-200",   bg: "bg-slate-50",   fg: "text-slate-600" },
};

function Toast({ type, message }) {
  const s = TOAST_STYLE[type] || TOAST_STYLE.info;
  const Icon = s.icon;
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:left-auto sm:right-4 sm:justify-end">
      <div
        role="status"
        className={`flex items-center gap-2.5 rounded-xl border ${s.ring} ${s.bg} px-4 py-3 text-sm font-medium shadow-lg ${s.fg}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}

/* ---------- container ----------------------------------------------- */

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const status = useSelector(selectAuthStatus);
  const authError = useSelector(selectAuthError);

  const [toast, setToast] = useState(null);

  const flash = useCallback((type, message, ms = 2800) => {
    setToast({ type, message });
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(null), ms);
  }, []);

  // Rehydrate the user if the store is empty (e.g. opened straight to /profile).
  useEffect(() => {
    if (!user && status !== "loading") dispatch(fetchCurrentUser());
  }, [user, status, dispatch]);

  // Mirror slice errors into the toast, then clear them from the store.
  useEffect(() => {
    if (authError) {
      flash("error", authError, 4000);
      dispatch(clearError());
    }
  }, [authError, dispatch, flash]);

  const handleSave = useCallback(
    async (form) => {
      const patch = buildPatch(form, user);

      if (Object.keys(patch).length === 0) {
        flash("info", "No changes to save");
        return false; // tells Profile to stay in edit mode
      }

      // .unwrap() throws on rejection; Profile's try/catch keeps the form open.
      await dispatch(updateProfile(patch)).unwrap();
      flash("success", "Profile updated");
      return true;
    },
    [dispatch, user, flash]
  );

  // Initial load before the user exists in the store.
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-400">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your profile…
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} />}
      <Profile user={user} onSave={handleSave} />
    </>
  );
}