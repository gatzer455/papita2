import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FSNode, vfs } from '../lib/virtualFS';

// Define the state type
interface FileSystemState {
  nodes: Record<string, FSNode>;
  rootId: string;
  currentNodeId: string | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: FileSystemState = {
  nodes: {},
  rootId: '',
  currentNodeId: null,
  loading: false,
  error: null,
};

// Async thunks for performing file system operations

// Initialize the file system
export const initializeFS = createAsyncThunk(
  'fileSystem/initialize',
  async () => {
    await vfs.initialize();
    return {
      nodes: vfs.getNodes(),
      rootId: vfs.getRootId(),
    };
  }
);

// Create a new file
export const createFile = createAsyncThunk(
  'fileSystem/createFile',
  async ({ name, parentId, content = '' }: { name: string; parentId: string; content?: string }) => {
    const newFile = await vfs.createFile(name, parentId, content);
    return newFile;
  }
);

// Create a new directory
export const createDirectory = createAsyncThunk(
  'fileSystem/createDirectory',
  async ({ name, parentId }: { name: string; parentId: string }) => {
    const newDirectory = await vfs.createDirectory(name, parentId);
    return newDirectory;
  }
);

// Update a file's content
export const updateFile = createAsyncThunk(
  'fileSystem/updateFile',
  async ({ id, content }: { id: string; content: string }) => {
    const updatedFile = await vfs.updateFile(id, content);
    return updatedFile;
  }
);

// Rename a node
export const renameNode = createAsyncThunk(
  'fileSystem/renameNode',
  async ({ id, newName }: { id: string; newName: string }) => {
    const updatedNode = await vfs.renameNode(id, newName);
    return updatedNode;
  }
);

// Delete a node
export const deleteNode = createAsyncThunk(
  'fileSystem/deleteNode',
  async (id: string, { getState }) => {
    const state = getState() as { fileSystem: FileSystemState };
    await vfs.deleteNode(id);
    
    // If the deleted node is the current node, set currentNodeId to null
    if (state.fileSystem.currentNodeId === id) {
      return { id, wasCurrentNode: true };
    }
    
    return { id, wasCurrentNode: false };
  }
);

// Move a node
export const moveNode = createAsyncThunk(
  'fileSystem/moveNode',
  async ({ id, newParentId }: { id: string; newParentId: string }) => {
    const updatedNode = await vfs.moveNode(id, newParentId);
    return updatedNode;
  }
);

// Create the file system slice
const fileSystemSlice = createSlice({
  name: 'fileSystem',
  initialState,
  reducers: {
    setCurrentNode: (state, action: PayloadAction<string | null>) => {
      state.currentNodeId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder.addCase(initializeFS.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeFS.fulfilled, (state, action) => {
      state.nodes = action.payload.nodes;
      state.rootId = action.payload.rootId;
      state.loading = false;
    });
    builder.addCase(initializeFS.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to initialize file system';
    });
    
    // Create file
    builder.addCase(createFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createFile.fulfilled, (state, action) => {
      state.nodes[action.payload.id] = action.payload;
      state.currentNodeId = action.payload.id;
      state.loading = false;
    });
    builder.addCase(createFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create file';
    });
    
    // Create directory
    builder.addCase(createDirectory.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createDirectory.fulfilled, (state, action) => {
      state.nodes[action.payload.id] = action.payload;
      state.loading = false;
    });
    builder.addCase(createDirectory.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create directory';
    });
    
    // Update file
    builder.addCase(updateFile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateFile.fulfilled, (state, action) => {
      state.nodes[action.payload.id] = action.payload;
      state.loading = false;
    });
    builder.addCase(updateFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update file';
    });
    
    // Rename node
    builder.addCase(renameNode.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(renameNode.fulfilled, (state, action) => {
      state.nodes[action.payload.id] = action.payload;
      state.loading = false;
    });
    builder.addCase(renameNode.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to rename node';
    });
    
    // Delete node
    builder.addCase(deleteNode.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteNode.fulfilled, (state, action) => {
      delete state.nodes[action.payload.id];
      if (action.payload.wasCurrentNode) {
        state.currentNodeId = null;
      }
      state.loading = false;
    });
    builder.addCase(deleteNode.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete node';
    });
    
    // Move node
    builder.addCase(moveNode.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(moveNode.fulfilled, (state, action) => {
      state.nodes[action.payload.id] = action.payload;
      state.loading = false;
    });
    builder.addCase(moveNode.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to move node';
    });
  },
});

// Export actions and reducer
export const { setCurrentNode, clearError } = fileSystemSlice.actions;
export default fileSystemSlice.reducer;