import React, { useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import Profile, { buildProfilePatch } from "./Profile";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  clearError,
  fetchCurrentUser,
  selectAuthError,
  selectAuthStatus,
  selectCurrentUser,
  updateProfile,
  uploadProfilePhoto,
} from "../../features/auth/authSlice";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const status = useAppSelector(selectAuthStatus);
  const authError = useAppSelector(selectAuthError);

  // ── Only fetch on mount (boot rehydration), never again automatically.
  // This prevents the race condition where a status change caused by
  // uploadProfilePhoto/fetchCurrentUser triggers ANOTHER fetchCurrentUser
  // that overwrites state.user with stale data.
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!user && !hasFetchedRef.current && status !== "loading") {
      hasFetchedRef.current = true;
      dispatch(fetchCurrentUser());
    }
  }, []); // ← empty deps: runs once on mount only

  useEffect(() => {
    if (!authError) return;
    toast.error(authError);
    dispatch(clearError());
  }, [authError, dispatch]);

  const handleSave = useCallback(
    async (form) => {
      try {
        const file = form.__profilePhotoFile;

        // ── Step 1: upload photo if a new file was selected ──────────────
        // if (file instanceof File) {
        //   await dispatch(uploadProfilePhoto(file)).unwrap();
        //   // Wait for Redux user to reflect the new profilePicture from DB
        //   await dispatch(fetchCurrentUser()).unwrap();
        //   toast.success("Profile photo updated!");
        // }
        if (file instanceof File) {
          await dispatch(uploadProfilePhoto(file)).unwrap();
          const result = await dispatch(fetchCurrentUser()).unwrap();
          console.log("✅ fetchCurrentUser result:", result);
          console.log("✅ result.profilePicture:", result?.profilePicture);
          toast.success("Profile photo updated!");
        }

        // ── Step 2: detect photo-only call (from avatar click) ───────────
        // Avatar click passes only { __profilePhotoFile: file } with no
        // other keys, so patch would be empty — skip updateProfile entirely.
        const isPhotoOnlyCall =
          Object.keys(form).filter(
            (k) => k !== "__profilePhotoFile" && k !== "profilePicture"
          ).length === 0;

        if (isPhotoOnlyCall) return true;

        // ── Step 3: build patch for text field changes ───────────────────
        const patch = buildProfilePatch(form, user);

        // Never send profilePicture in JSON patch — handled by /profile-photo
        if (patch.profilePicture !== undefined) delete patch.profilePicture;

        if (Object.keys(patch).length === 0) {
          if (!(file instanceof File)) {
            toast("No changes to save");
            return false;
          }
          return true;
        }

        // ── Step 4: save text field changes ─────────────────────────────
        await dispatch(updateProfile(patch)).unwrap();

        // Only re-fetch if no photo was uploaded (photo upload already fetched)
        if (!(file instanceof File)) {
          await dispatch(fetchCurrentUser()).unwrap();
        }

        toast.success("Profile updated!");
        return true;
      } catch (error) {
        toast.error(typeof error === "string" ? error : "Failed to update profile");
        dispatch(clearError());
        return false;
      }
    },
    [dispatch, user]
  );

  if (!user) {
    return (
      <div className="yp-profile-loader">
        <Loader2 size={18} className="yp-spin" />
        <span>Loading your profile...</span>
      </div>
    );
  }

  return <Profile user={user} onSave={handleSave} />;
}

