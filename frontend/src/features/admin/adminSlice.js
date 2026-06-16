// src/features/admin/adminSlice.js
// Complete admin slice — all exports your pages need are present.
// Trainees now fetch ALL records (limit=all) so batch-less trainees show too.
// List reducers hardened with Array.isArray guards (works for array OR {users,meta}).

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ─── Auth header helper ───────────────────────────────────────────────────────
const authHeader = (getState) => ({
  headers: { Authorization: `Bearer ${getState().auth.token}` },
});

// Normalize any list response to an array, regardless of which key it uses.
const toList = (payload, key) =>
  Array.isArray(payload) ? payload : (payload?.[key] ?? []);


// =============================================================================
// THUNKS — all declared before createSlice
// =============================================================================

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const fetchDashboard = createAsyncThunk(
  'admin/fetchDashboard',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${API}/api/admin/dashboard`,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load dashboard.'
      );
    }
  }
);

// ─── All users (generic — supports any role filter) ───────────────────────────
export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/admin/users`, {
        ...authHeader(getState),
        params,
      });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch users.'
      );
    }
  }
);

// ─── Trainees (role=trainee) ──────────────────────────────────────────────────
// Used by Trainees.jsx as: dispatch(fetchAdminTrainees())
// limit defaults to 'all' so EVERY trainee comes back (assigned to a batch or not).
export const fetchAdminTrainees = createAsyncThunk(
  'admin/fetchAdminTrainees',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/admin/users`, {
        ...authHeader(getState),
        // role forced to trainee; caller can still override limit if it ever needs to.
        params: { ...params, role: 'trainee', limit: params.limit ?? 'all' },
      });
      // Return the normalized { users, meta } block (same shape as fetchUsers/fetchTrainers).
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch trainees.'
      );
    }
  }
);

// ─── Trainers (role=trainer) ──────────────────────────────────────────────────
// Used by Trainers.jsx as: dispatch(fetchTrainers())
export const fetchTrainers = createAsyncThunk(
  'admin/fetchTrainers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/admin/users`, {
        ...authHeader(getState),
        params: { ...params, role: 'trainer', limit: params.limit ?? 'all' },
      });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch trainers.'
      );
    }
  }
);

// ─── Create user ──────────────────────────────────────────────────────────────
export const createUser = createAsyncThunk(
  'admin/createUser',
  async (userData, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/admin/users`,
        userData,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create user.'
      );
    }
  }
);

// ─── Get single user ──────────────────────────────────────────────────────────
export const getUser = createAsyncThunk(
  'admin/getUser',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${API}/api/admin/users/${userId}`,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch user.'
      );
    }
  }
);

// ─── Update user ──────────────────────────────────────────────────────────────
export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ userId, userData }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${API}/api/admin/users/${userId}`,
        userData,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to update user.'
      );
    }
  }
);

// ─── Toggle user active/inactive ─────────────────────────────────────────────
export const toggleUserStatus = createAsyncThunk(
  'admin/toggleUserStatus',
  async ({ userId, isActive }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.patch(
        `${API}/api/admin/users/${userId}/status`,
        { isActive },
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to update user status.'
      );
    }
  }
);

// ─── Delete user ──────────────────────────────────────────────────────────────
export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.delete(
        `${API}/api/admin/users/${userId}`,
        authHeader(getState)
      );
      return { userId, message: data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to delete user.'
      );
    }
  }
);

// ─── Batches ──────────────────────────────────────────────────────────────────
export const fetchBatches = createAsyncThunk(
  'admin/fetchBatches',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/admin/batches`, {
        ...authHeader(getState),
        params,
      });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch batches.'
      );
    }
  }
);

// ─── Registrations / Leads ────────────────────────────────────────────────────
export const fetchRegistrations = createAsyncThunk(
  'admin/fetchRegistrations',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API}/api/admin/registrations`, {
        ...authHeader(getState),
        params,
      });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch registrations.'
      );
    }
  }
);

// ─── Create registration/lead ─────────────────────────────────────────────────
export const createRegistration = createAsyncThunk(
  'admin/createRegistration',
  async (registrationData, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/admin/registrations`,
        registrationData,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create registration.'
      );
    }
  }
);

// ─── Get single registration ──────────────────────────────────────────────────
export const getRegistration = createAsyncThunk(
  'admin/getRegistration',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${API}/api/admin/registrations/${id}`,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch registration.'
      );
    }
  }
);

// ─── Update registration ──────────────────────────────────────────────────────
export const updateRegistration = createAsyncThunk(
  'admin/updateRegistration',
  async ({ id, ...updateData }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.patch(
        `${API}/api/admin/registrations/${id}`,
        updateData,
        authHeader(getState)
      );
      return data.data || data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to update registration.'
      );
    }
  }
);

// ─── Delete registration ──────────────────────────────────────────────────────
export const deleteRegistration = createAsyncThunk(
  'admin/deleteRegistration',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.delete(
        `${API}/api/admin/registrations/${id}`,
        authHeader(getState)
      );
      return { id, message: data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to delete registration.'
      );
    }
  }
);

// ─── Convert lead → trainee ───────────────────────────────────────────────────
export const convertLead = createAsyncThunk(
  'admin/convertLead',
  async ({ id, batchId, role = 'trainee' }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/admin/registrations/${id}/convert`,
        { batchId, role },
        authHeader(getState)
      );
      return { registrationId: id, data: data.data || data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to convert lead.'
      );
    }
  }
);

// ── Alias so Registrations.jsx import works without changing that file ─────────
export const convertRegistration = convertLead;

// ─── Assign trainer to batch ──────────────────────────────────────────────────
export const assignTrainerToBatch = createAsyncThunk(
  'admin/assignTrainerToBatch',
  async ({ trainerId, batchId }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/admin/trainers/${trainerId}/assign-batch`,
        { batchId },
        authHeader(getState)
      );
      return { trainerId, batchId, data: data.data || data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to assign trainer to batch.'
      );
    }
  }
);

// ─── Get trainer batch assignments ────────────────────────────────────────────
export const fetchTrainerBatchAssignments = createAsyncThunk(
  'admin/fetchTrainerBatchAssignments',
  async (trainerId, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${API}/api/trainers/${trainerId}/batches`,
        authHeader(getState)
      );
      return { trainerId, batchIds: data.batchIds || [] };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to fetch trainer batch assignments.'
      );
    }
  }
);

// ─── Assign trainees to batch ─────────────────────────────────────────────────
export const assignTraineesToBatch = createAsyncThunk(
  'admin/assignTraineesToBatch',
  async ({ batchId, traineeIds }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${API}/api/admin/trainees/assign-batch`,
        { batchId, traineeIds },
        authHeader(getState)
      );
      return { batchId, traineeIds, data: data.data || data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to assign trainees to batch.'
      );
    }
  }
);

// =============================================================================
// INITIAL STATE
// =============================================================================
const initialState = {
  // Dashboard
  dashboard:  null,
  dashStatus: 'idle',   // 'idle' | 'loading' | 'succeeded' | 'failed'
  dashError:  null,

  // All users (generic)
  users:       [],
  usersMeta:   null,
  usersStatus: 'idle',
  usersError:  null,

  // Single user
  selectedUser: null,
  selectedUserStatus: 'idle',
  selectedUserError: null,

  // Trainees (role=trainee)
  trainees:       [],
  traineesMeta:   null,
  traineesStatus: 'idle',
  traineesError:  null,

  // Trainers (role=trainer)
  trainers:       [],
  trainersMeta:   null,
  trainersStatus: 'idle',
  trainersError:  null,

  // Batches
  batches:       [],
  batchesMeta:   null,
  batchesStatus: 'idle',
  batchesError:  null,

  // Registrations
  registrations:       [],
  registrationsMeta:   null,
  registrationsStatus: 'idle',
  registrationsError:  null,
};

// =============================================================================
// SLICE
// =============================================================================
const adminSlice = createSlice({
  name: 'admin',
  initialState,

  reducers: {
    clearAdminError(state) {
      state.dashError          = null;
      state.usersError         = null;
      state.traineesError      = null;
      state.trainersError      = null;
      state.batchesError       = null;
      state.registrationsError = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── fetchDashboard ─────────────────────────────────────────────────────
      .addCase(fetchDashboard.pending, (state) => {
        state.dashStatus = 'loading';
        state.dashError  = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashStatus = 'succeeded';
        state.dashboard  = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.dashStatus = 'failed';
        state.dashError  = action.payload;
      })

      // ── fetchUsers (generic) ───────────────────────────────────────────────
      .addCase(fetchUsers.pending, (state) => {
        state.usersStatus = 'loading';
        state.usersError  = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersStatus = 'succeeded';
        state.users       = toList(action.payload, 'users');
        state.usersMeta   = action.payload?.meta || null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersStatus = 'failed';
        state.usersError  = action.payload;
      })

      // ── fetchAdminTrainees ─────────────────────────────────────────────────
      .addCase(fetchAdminTrainees.pending, (state) => {
        state.traineesStatus = 'loading';
        state.traineesError  = null;
      })
      .addCase(fetchAdminTrainees.fulfilled, (state, action) => {
        state.traineesStatus = 'succeeded';
        state.trainees       = toList(action.payload, 'users');
        state.traineesMeta   = action.payload?.meta || null;
      })
      .addCase(fetchAdminTrainees.rejected, (state, action) => {
        state.traineesStatus = 'failed';
        state.traineesError  = action.payload;
      })

      // ── fetchTrainers ──────────────────────────────────────────────────────
      .addCase(fetchTrainers.pending, (state) => {
        state.trainersStatus = 'loading';
        state.trainersError  = null;
      })
      .addCase(fetchTrainers.fulfilled, (state, action) => {
        state.trainersStatus = 'succeeded';
        state.trainers       = toList(action.payload, 'users');
        state.trainersMeta   = action.payload?.meta || null;
      })
      .addCase(fetchTrainers.rejected, (state, action) => {
        state.trainersStatus = 'failed';
        state.trainersError  = action.payload;
      })

      // ── createUser ─────────────────────────────────────────────────────────
      .addCase(createUser.fulfilled, (state, action) => {
        const newUser = action.payload;
        state.users.unshift(newUser);
        if (newUser.role === 'trainee') {
          state.trainees.unshift(newUser);
        } else if (newUser.role === 'trainer') {
          state.trainers.unshift(newUser);
        }
      })

      // ── getUser ────────────────────────────────────────────────────────────
      .addCase(getUser.pending, (state) => {
        state.selectedUserStatus = 'loading';
        state.selectedUserError = null;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.selectedUserStatus = 'succeeded';
        state.selectedUser = action.payload;
      })
      .addCase(getUser.rejected, (state, action) => {
        state.selectedUserStatus = 'failed';
        state.selectedUserError = action.payload;
      })

      // ── updateUser ─────────────────────────────────────────────────────────
      .addCase(updateUser.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = String(updated._id);
        const patch = (arr) => {
          const i = arr.findIndex(u => String(u._id) === id);
          if (i !== -1) arr[i] = updated;
        };
        patch(state.users);
        patch(state.trainees);
        patch(state.trainers);
        if (state.selectedUser && String(state.selectedUser._id) === id) {
          state.selectedUser = updated;
        }
      })

      // ── toggleUserStatus ───────────────────────────────────────────────────
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        const id      = String(updated._id);
        // Update in all three lists so UI stays in sync regardless of which page used it
        const patch = (arr) => {
          const i = arr.findIndex(u => String(u._id) === id);
          if (i !== -1) arr[i] = updated;
        };
        patch(state.users);
        patch(state.trainees);
        patch(state.trainers);
      })

      // ── deleteUser ─────────────────────────────────────────────────────────
      .addCase(deleteUser.fulfilled, (state, action) => {
        const { userId } = action.payload;
        const id = String(userId);
        state.users = state.users.filter(u => String(u._id) !== id);
        state.trainees = state.trainees.filter(u => String(u._id) !== id);
        state.trainers = state.trainers.filter(u => String(u._id) !== id);
      })

      // ── fetchBatches ───────────────────────────────────────────────────────
      .addCase(fetchBatches.pending, (state) => {
        state.batchesStatus = 'loading';
        state.batchesError  = null;
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.batchesStatus = 'succeeded';
        state.batches       = toList(action.payload, 'batches');
        state.batchesMeta   = action.payload?.meta || null;
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.batchesStatus = 'failed';
        state.batchesError  = action.payload;
      })

      // ── fetchRegistrations ─────────────────────────────────────────────────
      .addCase(fetchRegistrations.pending, (state) => {
        state.registrationsStatus = 'loading';
        state.registrationsError  = null;
      })
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.registrationsStatus = 'succeeded';
        state.registrations       = toList(action.payload, 'registrations');
        state.registrationsMeta   = action.payload?.meta || null;
      })
      .addCase(fetchRegistrations.rejected, (state, action) => {
        state.registrationsStatus = 'failed';
        state.registrationsError  = action.payload;
      })

      // ── convertLead (and convertRegistration alias) ────────────────────────
      .addCase(convertLead.fulfilled, (state, action) => {
        // Remove converted registration from list
        state.registrations = state.registrations.filter(
          r => String(r._id) !== String(action.payload.registrationId)
        );
        // Bump trainee count on dashboard
        if (state.dashboard?.totalTrainees != null) {
          state.dashboard.totalTrainees += 1;
        }
      })

      // ── createRegistration ─────────────────────────────────────────────────
      .addCase(createRegistration.fulfilled, (state, action) => {
        state.registrations.unshift(action.payload);
      })

      // ── getRegistration ────────────────────────────────────────────────────
      .addCase(getRegistration.fulfilled, (state, action) => {
        // Update the registration in the list if it exists
        const index = state.registrations.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.registrations[index] = action.payload;
        }
      })

      // ── updateRegistration ─────────────────────────────────────────────────
      .addCase(updateRegistration.fulfilled, (state, action) => {
        const index = state.registrations.findIndex(r => r._id === action.payload._id);
        if (index !== -1) {
          state.registrations[index] = action.payload;
        }
      })

      // ── deleteRegistration ─────────────────────────────────────────────────
      .addCase(deleteRegistration.fulfilled, (state, action) => {
        state.registrations = state.registrations.filter(r => r._id !== action.payload.id);
      })

      // ── assignTrainerToBatch ──────────────────────────────────────────────
      .addCase(assignTrainerToBatch.fulfilled, (state, action) => {
        const { trainerId, batchId } = action.payload;
        // Update trainer in trainers list
        const trainerIndex = state.trainers.findIndex(t => String(t._id) === String(trainerId));
        if (trainerIndex !== -1) {
          state.trainers[trainerIndex].batchId = batchId;
        }
        // Update batch in batches list
        const batchIndex = state.batches.findIndex(b => String(b._id) === String(batchId));
        if (batchIndex !== -1) {
          state.batches[batchIndex].trainerId = trainerId;
        }
      })

      // ── assignTraineesToBatch ──────────────────────────────────────────────
      .addCase(assignTraineesToBatch.fulfilled, (state, action) => {
        const { batchId, traineeIds } = action.payload;
        // Update trainees in trainees list
        traineeIds.forEach(traineeId => {
          const traineeIndex = state.trainees.findIndex(t => String(t._id) === String(traineeId));
          if (traineeIndex !== -1) {
            state.trainees[traineeIndex].batchId = batchId;
          }
        });
      });
  },
});

// =============================================================================
// SELECTORS
// Full set — every name your pages import must be listed here.
// =============================================================================

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const selectAdminDashboard = (state) => state.admin.dashboard;
export const selectAdminStatus    = (state) => state.admin.dashStatus;
export const selectAdminError     = (state) => state.admin.dashError;

// ── Users (generic) ───────────────────────────────────────────────────────────
export const selectAdminUsers       = (state) => state.admin.users;
export const selectAdminUsersMeta   = (state) => state.admin.usersMeta;
export const selectAdminUsersStatus = (state) => state.admin.usersStatus;
export const selectAdminUsersError  = (state) => state.admin.usersError;

// ── Trainees ──────────────────────────────────────────────────────────────────
export const selectAdminTrainees       = (state) => state.admin.trainees;
export const selectAdminTraineesMeta   = (state) => state.admin.traineesMeta;
export const selectAdminTraineesStatus = (state) => state.admin.traineesStatus;
export const selectAdminTraineesError  = (state) => state.admin.traineesError;

// Alias — Trainees.jsx imports selectAllAdminTrainees
export const selectAllAdminTrainees = selectAdminTrainees;

// ── Trainers ──────────────────────────────────────────────────────────────────
export const selectAdminTrainers       = (state) => state.admin.trainers;
export const selectAdminTrainersMeta   = (state) => state.admin.trainersMeta;
export const selectAdminTrainersStatus = (state) => state.admin.trainersStatus;
export const selectAdminTrainersError  = (state) => state.admin.trainersError;

// Alias — Trainers.jsx imports selectAllTrainers
export const selectAllTrainers = selectAdminTrainers;

// ── Batches ───────────────────────────────────────────────────────────────────
export const selectAdminBatches       = (state) => state.admin.batches;
export const selectAdminBatchesMeta   = (state) => state.admin.batchesMeta;
export const selectAdminBatchesStatus = (state) => state.admin.batchesStatus;
export const selectAdminBatchesError  = (state) => state.admin.batchesError;

// Alias — Batches.jsx imports selectAllBatches
export const selectAllBatches = selectAdminBatches;

// ── Registrations ─────────────────────────────────────────────────────────────
export const selectAdminRegistrations       = (state) => state.admin.registrations;
export const selectAdminRegistrationsMeta   = (state) => state.admin.registrationsMeta;
export const selectAdminRegistrationsStatus = (state) => state.admin.registrationsStatus;
export const selectAdminRegistrationsError  = (state) => state.admin.registrationsError;

// Alias — Registrations.jsx imports selectAllRegistrations
export const selectAllRegistrations = selectAdminRegistrations;

// =============================================================================
// NAMED ACTIONS + DEFAULT EXPORT
// =============================================================================
export const { clearAdminError } = adminSlice.actions;

export default adminSlice.reducer;