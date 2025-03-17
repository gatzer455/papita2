import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/tauri';

// Define API state interface
interface ApiState {
  apiKey: string | null;
  isGenerating: boolean;
  error: string | null;
  lastGeneratedCode: string | null;
}

// Initial state
const initialState: ApiState = {
  apiKey: null,
  isGenerating: false,
  error: null,
  lastGeneratedCode: null,
};

// Async thunk for generating code
export const generateCode = createAsyncThunk(
  'api/generateCode',
  async (prompt: string, { getState, rejectWithValue }) => {
    const state = getState() as { api: ApiState };
    
    if (!state.api.apiKey) {
      return rejectWithValue('API key not set. Please set your API key in the settings.');
    }
    
    try {
      // Call the Tauri command to generate code
      const response = await invoke<{ generated_code: string; error: string | null }>('generate_code', {
        prompt,
      });
      
      if (response.error) {
        return rejectWithValue(response.error);
      }
      
      return response.generated_code;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to generate code');
    }
  }
);

// Async thunk for setting the API key
export const setApiKey = createAsyncThunk(
  'api/setApiKey',
  async (apiKey: string, { rejectWithValue }) => {
    try {
      // Call the Tauri command to set the API key
      await invoke('set_api_key', { key: apiKey });
      return apiKey;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to set API key');
    }
  }
);

// Create the API slice
const apiSlice = createSlice({
  name: 'api',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearGeneratedCode: (state) => {
      state.lastGeneratedCode = null;
    },
  },
  extraReducers: (builder) => {
    // Generate code
    builder.addCase(generateCode.pending, (state) => {
      state.isGenerating = true;
      state.error = null;
    });
    builder.addCase(generateCode.fulfilled, (state, action) => {
      state.isGenerating = false;
      state.lastGeneratedCode = action.payload;
    });
    builder.addCase(generateCode.rejected, (state, action) => {
      state.isGenerating = false;
      state.error = action.payload as string;
    });
    
    // Set API key
    builder.addCase(setApiKey.fulfilled, (state, action) => {
      state.apiKey = action.payload;
      state.error = null;
    });
    builder.addCase(setApiKey.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

// Export actions and reducer
export const { clearError, clearGeneratedCode } = apiSlice.actions;
export default apiSlice.reducer;