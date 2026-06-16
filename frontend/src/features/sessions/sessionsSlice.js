// src/features/sessions/sessionsSlice.js   (TRAINEE-side slice)
// Namespaced as "traineeSessions" so it never collides with the trainer-side
// slice in features/session/sessionsSlice.js (which uses "sessions").
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Async Thunks ──────────────────────────────────────────────────────────────

// GET /api/sessions  → sessions where you're the trainer OR an enrolled trainee
export const fetchSessions = createAsyncThunk(
  'traineeSessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/sessions', getAuthHeader());
      const data = res.data;

      // Accept a bare array, or a wrapped { sessions: [] } / { data: [] } shape.
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.sessions)
        ? data.sessions
        : Array.isArray(data?.data)
        ? data.data
        : null;

      if (!list) {
        // Most common cause: the request hit the React dev server, so we got the
        // index.html string back instead of JSON → fix your proxy / axios baseURL.
        return rejectWithValue(
          typeof data === 'string'
            ? '/api/sessions returned HTML, not JSON. Configure the dev-server proxy or axios baseURL so it reaches your backend.'
            : 'Unexpected /api/sessions response shape.'
        );
      }
      return list;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

export const createSession = createAsyncThunk(
  'traineeSessions/createSession',
  async (sessionData, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/sessions', sessionData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create session');
    }
  }
);

export const updateSession = createAsyncThunk(
  'traineeSessions/updateSession',
  async ({ id, ...sessionData }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`/api/sessions/${id}`, sessionData, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update session');
    }
  }
);

export const deleteSession = createAsyncThunk(
  'traineeSessions/deleteSession',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/sessions/${id}`, getAuthHeader());
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete session');
    }
  }
);

// POST /api/sessions/:id/enroll  → trainee self-enrolls; returns the updated session
export const enrollSession = createAsyncThunk(
  'traineeSessions/enrollSession',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.post(`/api/sessions/${id}/enroll`, {}, getAuthHeader());
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to enroll');
    }
  }
);

// POST /api/sessions/:id/join  → returns the LiveKit { token, url, role } for the room
export const joinSession = createAsyncThunk(
  'traineeSessions/joinSession',
  async ({ id, passcode } = {}, { rejectWithValue }) => {
    try {
      const res = await axios.post(`/api/sessions/${id}/join`, { passcode }, getAuthHeader());
      return { id, ...res.data }; // { id, token, url, role }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Could not join session');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const upsert = (items, session) => {
  const i = items.findIndex((s) => s._id === session._id);
  if (i === -1) items.push(session);
  else items[i] = session;
};

const traineeSessionsSlice = createSlice({
  name: 'traineeSessions',
  initialState: {
    items: [],
    status: 'idle', // idle | loading | succeeded | failed
    error: null,

    // live-room connection from the last successful joinSession
    connection: null, // { id, token, url, role }
    joinStatus: 'idle',
    joinError: null,
  },
  reducers: {
    clearConnection(state) {
      state.connection = null;
      state.joinStatus = 'idle';
      state.joinError = null;
    },
    clearSessionError(state) {
      state.error = null;
      state.joinError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchSessions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // create / update / enroll all return a session → upsert it
      .addCase(createSession.fulfilled, (state, action) => { upsert(state.items, action.payload); })
      .addCase(updateSession.fulfilled, (state, action) => { upsert(state.items, action.payload); })
      .addCase(enrollSession.fulfilled, (state, action) => { upsert(state.items, action.payload); })

      // delete
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s._id !== action.payload);
      })

      // join → store the LiveKit connection
      .addCase(joinSession.pending, (state) => {
        state.joinStatus = 'loading';
        state.joinError = null;
      })
      .addCase(joinSession.fulfilled, (state, action) => {
        state.joinStatus = 'succeeded';
        state.connection = action.payload;
      })
      .addCase(joinSession.rejected, (state, action) => {
        state.joinStatus = 'failed';
        state.joinError = action.payload;
      });
  },
});

export const { clearConnection, clearSessionError } = traineeSessionsSlice.actions;

// ── Selectors (read the dedicated traineeSessions key; optional-chained) ──────
export const selectSessions       = (s) => s.traineeSessions?.items ?? [];
export const selectSessionsStatus = (s) => s.traineeSessions?.status ?? 'idle';
export const selectSessionsError  = (s) => s.traineeSessions?.error ?? null;
export const selectConnection     = (s) => s.traineeSessions?.connection ?? null;
export const selectJoinStatus     = (s) => s.traineeSessions?.joinStatus ?? 'idle';
export const selectJoinError      = (s) => s.traineeSessions?.joinError ?? null;

export default traineeSessionsSlice.reducer;