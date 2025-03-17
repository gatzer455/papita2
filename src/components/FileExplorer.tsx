import { createSignal, createEffect, For, Show } from 'solid-js';
import { useStore, useAppDispatch } from '../hooks/store';
import { RootState, AppDispatch } from '../store/store';
import { 
  setCurrentNode, 
  createFile, 
  createDirectory, 
  renameNode, 
  deleteNode 
} from '../store/fileSystemSlice';
import { FSNode } from '../lib/virtualFS';

// FileExplorer component
export default function FileExplorer() {
  const dispatch = useAppDispatch();
  
  // Get state from Redux
  const fileSystem = useStore((state: RootState) => state.fileSystem);
  
  // Local state
  const [expandedFolders, setExpandedFolders] = createSignal<Set<string>>(new Set());
  const [newItemName, setNewItemName] = createSignal('');
  const [newItemType, setNewItemType] = createSignal<'file' | 'directory' | null>(null);
  const [editingNodeId, setEditingNodeId] = createSignal<string | null>(null);
  const [newFolderParentId, setNewFolderParentId] = createSignal<string | null>(null);
  
  // Effect to auto-expand the root directory
  createEffect(() => {
    if (fileSystem().rootId && !expandedFolders().has(fileSystem().rootId)) {
      const newExpanded = new Set(expandedFolders());
      newExpanded.add(fileSystem().rootId);
      setExpandedFolders(newExpanded);
    }
  });
  
  // Toggle folder expanded state
  function toggleFolderExpanded(id: string) {
    const newExpanded = new Set(expandedFolders());
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  }
  
  // Get children of a node
  function getChildNodes(parentId: string) {
    return Object.values(fileSystem().nodes)
      .filter(node => node.parentId === parentId)
      .sort((a, b) => {
        // Sort directories first, then by name
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
  }
  
  // Select a node
  function handleNodeClick(node: FSNode) {
    dispatch(setCurrentNode(node.id));
  }
  
  // Start creating a new item
  function startNewItem(type: 'file' | 'directory', parentId: string) {
    setNewItemType(type);
    setNewFolderParentId(parentId);
    setNewItemName('');
  }
  
  // Cancel creating a new item
  function cancelNewItem() {
    setNewItemType(null);
    setNewFolderParentId(null);
    setNewItemName('');
  }
  
  // Submit new item creation
  function handleCreateNewItem() {
    if (!newItemName() || !newFolderParentId() || !newItemType()) return;
    
    if (newItemType() === 'file') {
      dispatch(createFile({ 
        name: newItemName(), 
        parentId: newFolderParentId()!, 
      }));
    } else {
      dispatch(createDirectory({ 
        name: newItemName(), 
        parentId: newFolderParentId()!, 
      }));
    }
    
    // Make sure the parent folder is expanded
    const newExpanded = new Set(expandedFolders());
    newExpanded.add(newFolderParentId()!);
    setExpandedFolders(newExpanded);
    
    // Reset form
    cancelNewItem();
  }
  
  // Start renaming a node
  function startRenaming(id: string, name: string) {
    setEditingNodeId(id);
    setNewItemName(name);
  }
  
  // Submit node rename
  function handleRename() {
    if (!editingNodeId() || !newItemName()) return;
    
    dispatch(renameNode({ 
      id: editingNodeId()!, 
      newName: newItemName() 
    }));
    
    setEditingNodeId(null);
    setNewItemName('');
  }
  
  // Delete a node
  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      dispatch(deleteNode(id));
    }
  }
  
  // Recursive function to render a folder and its children
  const FolderNode = (props: { node: FSNode }) => {
    const isExpanded = () => expandedFolders().has(props.node.id);
    const children = () => getChildNodes(props.node.id);
    
    return (
      <div class="folder-node">
        <div 
          class={`folder-header ${fileSystem().currentNodeId === props.node.id ? 'selected' : ''}`}
          onClick={() => handleNodeClick(props.node)}
        >
          <span 
            class="folder-toggle" 
            onClick={(e) => { e.stopPropagation(); toggleFolderExpanded(props.node.id); }}
          >
            {isExpanded() ? '▼' : '►'}
          </span>
          
          <Show when={editingNodeId() !== props.node.id} fallback={
            <input 
              type="text" 
              value={newItemName()} 
              onInput={(e) => setNewItemName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              onBlur={handleRename}
              autofocus
            />
          }>
            <span class="folder-name">📁 {props.node.name}</span>
            
            <div class="folder-actions">
              <button 
                onClick={(e) => { e.stopPropagation(); startNewItem('file', props.node.id); }}
                title="New File"
              >
                +F
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); startNewItem('directory', props.node.id); }}
                title="New Folder"
              >
                +D
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); startRenaming(props.node.id, props.node.name); }}
                title="Rename"
              >
                ✏️
              </button>
              <Show when={props.node.id !== fileSystem().rootId}>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(props.node.id); }}
                  title="Delete"
                >
                  🗑️
                </button>
              </Show>
            </div>
          </Show>
        </div>
        
        <Show when={isExpanded()}>
          <div class="folder-children">
            <Show when={newItemType() !== null && newFolderParentId() === props.node.id}>
              <div class="new-item-form">
                <input 
                  type="text" 
                  value={newItemName()} 
                  onInput={(e) => setNewItemName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNewItem()}
                  placeholder={`New ${newItemType() === 'file' ? 'file' : 'folder'} name...`}
                  autofocus
                />
                <button onClick={handleCreateNewItem}>Create</button>
                <button onClick={cancelNewItem}>Cancel</button>
              </div>
            </Show>
            
            <For each={children()}>
              {(child) => (
                <Show
                  when={child.type === 'directory'}
                  fallback={<FileNode node={child} />}
                >
                  <FolderNode node={child} />
                </Show>
              )}
            </For>
          </div>
        </Show>
      </div>
    );
  };
  
  // Component to render a file node
  const FileNode = (props: { node: FSNode }) => {
    return (
      <div 
        class={`file-node ${fileSystem().currentNodeId === props.node.id ? 'selected' : ''}`}
        onClick={() => handleNodeClick(props.node)}
      >
        <Show when={editingNodeId() !== props.node.id} fallback={
          <input 
            type="text" 
            value={newItemName()} 
            onInput={(e) => setNewItemName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            onBlur={handleRename}
            autofocus
          />
        }>
          <span class="file-name">📄 {props.node.name}</span>
          
          <div class="file-actions">
            <button 
              onClick={(e) => { e.stopPropagation(); startRenaming(props.node.id, props.node.name); }}
              title="Rename"
            >
              ✏️
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(props.node.id); }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </Show>
      </div>
    );
  };
  
  return (
    <div class="file-explorer">
      <div class="file-explorer-header">
        <h3>Files</h3>
      </div>
      
      <div class="file-explorer-content">
        <Show when={fileSystem().rootId && fileSystem().nodes[fileSystem().rootId]}>
          <FolderNode node={fileSystem().nodes[fileSystem().rootId]} />
        </Show>
      </div>
    </div>
  );
}