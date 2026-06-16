// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import authReducer        from '../features/auth/authSlice';
import adminReducer       from '../features/admin/adminSlice';
import hrReducer          from '../features/hr/hrSlice';
import traineeReducer     from '../features/trainee/traineeSlice';
import trainerReducer     from '../features/Trainer/trainerSlice';
import assignmentsReducer from '../features/assignment/assignmentsSlice';
import batchReducer       from '../features/session/batchSlice';
import courseReducer      from '../features/admin/courseSlice';

// Two DIFFERENT slices, two DIFFERENT files, two DIFFERENT keys:
import sessionsReducer        from '../features/session/sessionsSlice';   // trainer-side (existing)
import traineeSessionsReducer from '../features/sessions/sessionsSlice';  // trainee-side (new)

// Persist only auth so the user stays logged in on page refresh
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};

const rootReducer = combineReducers({
  auth:            persistReducer(authPersistConfig, authReducer),
  admin:           adminReducer,
  hr:              hrReducer,
  trainee:         traineeReducer,
  trainer:         trainerReducer,
  sessions:        sessionsReducer,         // ← trainer slice  -> selectors read s.sessions.*
  traineeSessions: traineeSessionsReducer,  // ← trainee slice  -> selectors read s.traineeSessions.*
  assignments:     assignmentsReducer,
  batches:         batchReducer,
  courses:         courseReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;