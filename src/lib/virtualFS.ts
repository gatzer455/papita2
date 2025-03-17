import { get, set, del } from 'idb-keyval';

// Define file system types
export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  language?: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface FileSystemState {
  nodes: Record<string, FSNode>;
  rootId: string;
}

// Default supported languages
export const SUPPORTED_LANGUAGES = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'rs': 'rust',
  'json': 'json',
  'md': 'markdown',
  'html': 'html',
  'css': 'css',
  'txt': 'plaintext',
};

// Helper to detect language from file extension
export function detectLanguage(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_LANGUAGES[extension as keyof typeof SUPPORTED_LANGUAGES] || 'plaintext';
}

// Generate a unique ID for nodes
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Class for managing the virtual file system
export class VirtualFileSystem {
  private state: FileSystemState;
  private DB_KEY = 'papita2-vfs';
  
  constructor() {
    // Initialize with empty state
    this.state = {
      nodes: {},
      rootId: '',
    };
  }
  
  // Initialize the file system
  async initialize(): Promise<void> {
    try {
      // Try to load existing state from IndexedDB
      const savedState = await get(this.DB_KEY);
      
      if (savedState) {
        this.state = savedState as FileSystemState;
      } else {
        // Create a root directory if no state exists
        const rootId = generateId();
        const rootNode: FSNode = {
          id: rootId,
          name: 'root',
          type: 'directory',
          parentId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        this.state = {
          nodes: { [rootId]: rootNode },
          rootId,
        };
        
        // Save the initial state
        await this.save();
      }
    } catch (error) {
      console.error('Failed to initialize virtual file system:', error);
      throw error;
    }
  }
  
  // Save the current state to IndexedDB
  async save(): Promise<void> {
    try {
      await set(this.DB_KEY, this.state);
    } catch (error) {
      console.error('Failed to save virtual file system state:', error);
      throw error;
    }
  }
  
  // Get all nodes
  getNodes(): Record<string, FSNode> {
    return { ...this.state.nodes };
  }
  
  // Get root directory ID
  getRootId(): string {
    return this.state.rootId;
  }
  
  // Get node by ID
  getNode(id: string): FSNode | null {
    return this.state.nodes[id] || null;
  }
  
  // Get children of a node
  getChildren(parentId: string): FSNode[] {
    return Object.values(this.state.nodes).filter(node => node.parentId === parentId);
  }
  
  // Create a new file
  async createFile(name: string, parentId: string, content: string = ''): Promise<FSNode> {
    // Verify parent exists and is a directory
    const parent = this.getNode(parentId);
    if (!parent || parent.type !== 'directory') {
      throw new Error('Parent node not found or is not a directory');
    }
    
    // Check if file with same name already exists in the parent
    const siblings = this.getChildren(parentId);
    if (siblings.some(node => node.name === name)) {
      throw new Error(`A file or directory named '${name}' already exists`);
    }
    
    const id = generateId();
    const now = Date.now();
    
    const newFile: FSNode = {
      id,
      name,
      type: 'file',
      content,
      language: detectLanguage(name),
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.state.nodes[id] = newFile;
    await this.save();
    
    return newFile;
  }
  
  // Create a new directory
  async createDirectory(name: string, parentId: string): Promise<FSNode> {
    // Verify parent exists and is a directory
    const parent = this.getNode(parentId);
    if (!parent || parent.type !== 'directory') {
      throw new Error('Parent node not found or is not a directory');
    }
    
    // Check if directory with same name already exists in the parent
    const siblings = this.getChildren(parentId);
    if (siblings.some(node => node.name === name)) {
      throw new Error(`A file or directory named '${name}' already exists`);
    }
    
    const id = generateId();
    const now = Date.now();
    
    const newDirectory: FSNode = {
      id,
      name,
      type: 'directory',
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.state.nodes[id] = newDirectory;
    await this.save();
    
    return newDirectory;
  }
  
  // Update a file's content
  async updateFile(id: string, content: string): Promise<FSNode> {
    const file = this.getNode(id);
    if (!file || file.type !== 'file') {
      throw new Error('File not found');
    }
    
    const updatedFile: FSNode = {
      ...file,
      content,
      updatedAt: Date.now(),
    };
    
    this.state.nodes[id] = updatedFile;
    await this.save();
    
    return updatedFile;
  }
  
  // Rename a node (file or directory)
  async renameNode(id: string, newName: string): Promise<FSNode> {
    const node = this.getNode(id);
    if (!node) {
      throw new Error('Node not found');
    }
    
    // Check if a sibling with the same name already exists
    const siblings = this.getChildren(node.parentId || '');
    if (siblings.some(n => n.name === newName && n.id !== id)) {
      throw new Error(`A file or directory named '${newName}' already exists`);
    }
    
    // Update language if it's a file and extension changed
    let language = node.language;
    if (node.type === 'file') {
      language = detectLanguage(newName);
    }
    
    const updatedNode: FSNode = {
      ...node,
      name: newName,
      language,
      updatedAt: Date.now(),
    };
    
    this.state.nodes[id] = updatedNode;
    await this.save();
    
    return updatedNode;
  }
  
  // Delete a node and all its children (if it's a directory)
  async deleteNode(id: string): Promise<void> {
    // Can't delete root
    if (id === this.state.rootId) {
      throw new Error('Cannot delete root directory');
    }
    
    const node = this.getNode(id);
    if (!node) {
      throw new Error('Node not found');
    }
    
    // If it's a directory, delete all children recursively
    if (node.type === 'directory') {
      const childrenToDelete = this.getChildren(id);
      for (const child of childrenToDelete) {
        await this.deleteNode(child.id);
      }
    }
    
    // Delete the node
    delete this.state.nodes[id];
    await this.save();
  }
  
  // Move a node to a new parent
  async moveNode(id: string, newParentId: string): Promise<FSNode> {
    // Can't move root
    if (id === this.state.rootId) {
      throw new Error('Cannot move root directory');
    }
    
    const node = this.getNode(id);
    if (!node) {
      throw new Error('Node not found');
    }
    
    const newParent = this.getNode(newParentId);
    if (!newParent || newParent.type !== 'directory') {
      throw new Error('New parent not found or is not a directory');
    }
    
    // Can't move a node to its own descendant
    if (this.isDescendant(newParentId, id)) {
      throw new Error('Cannot move a node to its own descendant');
    }
    
    // Check if a node with the same name already exists in the new parent
    const siblings = this.getChildren(newParentId);
    if (siblings.some(n => n.name === node.name)) {
      throw new Error(`A file or directory named '${node.name}' already exists in the destination`);
    }
    
    const updatedNode: FSNode = {
      ...node,
      parentId: newParentId,
      updatedAt: Date.now(),
    };
    
    this.state.nodes[id] = updatedNode;
    await this.save();
    
    return updatedNode;
  }
  
  // Check if nodeB is a descendant of nodeA
  private isDescendant(nodeB: string, nodeA: string): boolean {
    let current = this.getNode(nodeB);
    
    while (current && current.parentId) {
      if (current.parentId === nodeA) {
        return true;
      }
      current = this.getNode(current.parentId);
    }
    
    return false;
  }
  
  // Export the file system as a JSON string
  exportFS(): string {
    return JSON.stringify(this.state);
  }
  
  // Import a file system from a JSON string
  async importFS(jsonString: string): Promise<void> {
    try {
      const importedState = JSON.parse(jsonString) as FileSystemState;
      
      // Validate the imported state
      if (!importedState.rootId || !importedState.nodes[importedState.rootId]) {
        throw new Error('Invalid file system data');
      }
      
      this.state = importedState;
      await this.save();
    } catch (error) {
      console.error('Failed to import virtual file system:', error);
      throw error;
    }
  }
  
  // Get the full path of a node
  getPath(id: string): string {
    const paths: string[] = [];
    let current = this.getNode(id);
    
    while (current) {
      paths.unshift(current.name);
      if (current.parentId) {
        current = this.getNode(current.parentId);
      } else {
        break;
      }
    }
    
    return paths.join('/');
  }
}

// Create and export a singleton instance
export const vfs = new VirtualFileSystem();