// src/features/auth/authSlice.js
// Complete corrected authSlice — thunks declared BEFORE the slice
// so extraReducers can reference them without hoisting issues.

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

// ─── Base API URL ─────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ─── Axios auth header helper ─────────────────────────────────────────────────
const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// =============================================================================
// THUNKS — declared BEFORE createSlice so extraReducers can reference them
// =============================================================================

// ─── Register ───────────────────────────────────────────────────────────────
export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password, role }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/register`, {
        name,
        email,
        password,
        role,
      });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, remember }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, {
        email,
        password,
      });
      // data = { success, accessToken, user, role }
      if (remember) {
        localStorage.setItem('token', data.token);
      }
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Invalid email or password.'
      );
    }
  }
);

// ─── Fetch current user (rehydrate auth state on app boot) ───────────────────
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const { data } = await axios.get(
        `${API}/api/auth/me`,
        authHeader(token)
      );
      return data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Session expired.'
      );
    }
  }
);

// ─── Logout (calls backend to rotate sessionToken) ───────────────────────────
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      await axios.post(
        `${API}/api/auth/logout`,
        {},
        authHeader(token)
      );
    } catch (err) {
      // Always clear client state even if server call fails
      return rejectWithValue(
        err.response?.data?.message || 'Logout failed.'
      );
    }
  }
);

// ─── Forgot Password — sends OTP to email ────────────────────────────────────
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/auth/forgot-password`,
        { email }
      );
      // data = { success: true, message: 'If that email is registered...' }
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to send OTP. Please try again.'
      );
    }
  }
);

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/auth/verify-otp`,
        { email, otp }
      );
      // data = { success: true, message: 'OTP verified', verified: true }
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Invalid or expired OTP.'
      );
    }
  }
);

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/auth/reset-password`,
        { email, otp, newPassword }
      );
      // data = { success: true, message: 'Password reset successfully...' }
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Password reset failed. Please try again.'
      );
    }
  }
);

// =============================================================================
// INITIAL STATE
// =============================================================================
const initialState = {
  user:            null,
  token:           localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  status:          'idle',  // 'idle' | 'loading'
  error:           null,
};

// =============================================================================
// SLICE
// =============================================================================
const authSlice = createSlice({
  name: 'auth',
  initialState,

  reducers: {
    // Clear Redux error state (called after showing toast)
    clearError(state) {
      state.error = null;
    },

    // Synchronous logout — wipes state + localStorage immediately
    // Use this for instant UI response; pair with logoutUser thunk for backend call
    logout(state) {
      state.user            = null;
      state.token           = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },

    // Called on Google OAuth callback — token arrives via URL query param
    setCredentials(state, action) {
      const { user, token } = action.payload;
      state.user            = user;
      state.token           = token;
      state.isAuthenticated = true;
      localStorage.setItem('token', token);
    },
  },

  extraReducers: (builder) => {
    builder

      // ── register ───────────────────────────────────────────────────────────
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'idle';
        state.error  = action.payload;
      })

      // ── login ──────────────────────────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status          = 'idle';
        state.user            = action.payload.user;
        state.token           = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'idle';
        state.error  = action.payload;
      })

      // ── fetchCurrentUser ───────────────────────────────────────────────────
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status          = 'idle';
        state.user            = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        // Token is invalid or expired — clear everything
        state.status          = 'idle';
        state.user            = null;
        state.token           = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })

      // ── logoutUser (async — calls backend to rotate sessionToken) ──────────
      .addCase(logoutUser.fulfilled, (state) => {
        state.user            = null;
        state.token           = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })
      .addCase(logoutUser.rejected, (state) => {
        // Clear client state even when server call fails
        state.user            = null;
        state.token           = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })

      // ── forgotPassword ─────────────────────────────────────────────────────
      .addCase(forgotPassword.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.status = 'idle';
        // No auth state change — ForgotPasswordPage handles step transition
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = 'idle';
        state.error  = action.payload;
      })

      // ── verifyOtp ──────────────────────────────────────────────────────────
      .addCase(verifyOtp.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = 'idle';
        state.error  = action.payload;
      })

      // ── resetPassword ──────────────────────────────────────────────────────
      .addCase(resetPassword.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.status = 'idle';
        // User must sign in fresh after reset — no auto-login
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'idle';
        state.error  = action.payload;
      });
  },
});

// =============================================================================
// SELECTORS
// =============================================================================
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUserRole        = (state) => state.auth.user?.role    ?? null;
export const selectCurrentUser     = (state) => state.auth.user;
export const selectAuthStatus      = (state) => state.auth.status;
export const selectAuthError       = (state) => state.auth.error;
export const selectToken           = (state) => state.auth.token;

// =============================================================================
// NAMED ACTIONS + DEFAULT EXPORT
// =============================================================================
export const { clearError, logout, setCredentials } = authSlice.actions;

export default authSlice.reducer;