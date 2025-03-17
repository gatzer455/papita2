import { configureStore } from '@reduxjs/toolkit';
import fileSystemReducer from './fileSystemSlice';
import apiReducer from './apiSlice';

// Configure the Redux store
const store = configureStore({
  reducer: {
    fileSystem: fileSystemReducer,
    api: apiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for complex objects
    }),
});

// Define the RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;