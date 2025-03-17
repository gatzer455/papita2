import { createEffect, createSignal, Show } from 'solid-js';
import { useStore, useAppDispatch } from '../hooks/store';
import { RootState, AppDispatch } from '../store/store';
import { updateFile } from '../store/fileSystemSlice';
import { generateCode } from '../store/apiSlice';
import Editor from '@monaco-editor/react';

// CodeEditor component
export default function CodeEditor() {
  const dispatch = useAppDispatch();
  
  // Get state from Redux
  const fileSystem = useStore((state: RootState) => state.fileSystem);
  const api = useStore((state: RootState) => state.api);
  
  // Local state
  const [editorContent, setEditorContent] = createSignal('');
  const [editorLanguage, setEditorLanguage] = createSignal('plaintext');
  const [prompt, setPrompt] = createSignal('');
  const [showGenerateForm, setShowGenerateForm] = createSignal(false);
  
  // Get current file
  const currentFile = () => {
    if (!fileSystem().currentNodeId) return null;
    const node = fileSystem().nodes[fileSystem().currentNodeId];
    return node && node.type === 'file' ? node : null;
  };
  
  // Update editor content when current file changes
  createEffect(() => {
    const file = currentFile();
    if (file) {
      setEditorContent(file.content || '');
      setEditorLanguage(file.language || 'plaintext');
    } else {
      setEditorContent('');
      setEditorLanguage('plaintext');
    }
  });
  
  // Handle editor content change
  function handleEditorChange(value: string | undefined) {
    if (value !== undefined) {
      setEditorContent(value);
    }
  }
  
  // Save current file
  function saveCurrentFile() {
    const file = currentFile();
    if (file) {
      dispatch(updateFile({ id: file.id, content: editorContent() }));
    }
  }
  
  // Handle key commands
  function handleEditorKeyDown(event: KeyboardEvent) {
    // Save on Ctrl+S or Cmd+S
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveCurrentFile();
    }
    
    // Check for /generate command
    const content = editorContent();
    const lines = content.split('\n');
    const cursorPos = (event.target as any)?.selectionStart || 0;
    const currentLineIndex = content.substring(0, cursorPos).split('\n').length - 1;
    
    if (currentLineIndex >= 0 && currentLineIndex < lines.length) {
      const currentLine = lines[currentLineIndex];
      if (currentLine.trim().startsWith('/generate ') && event.key === 'Enter') {
        event.preventDefault();
        const promptText = currentLine.trim().substring('/generate '.length);
        setPrompt(promptText);
        setShowGenerateForm(true);
      }
    }
  }
  
  // Generate code
  function handleGenerateCode() {
    if (!prompt()) return;
    
    dispatch(generateCode(prompt()))
      .then(() => {
        setShowGenerateForm(false);
        setPrompt('');
      });
  }
  
  // Insert generated code
  function insertGeneratedCode() {
    if (!api().lastGeneratedCode || !currentFile()) return;
    
    // Insert the generated code at the current cursor position
    const updatedContent = editorContent() + '\n' + api().lastGeneratedCode;
    setEditorContent(updatedContent);
    saveCurrentFile();
  }
  
  return (
    <div class="code-editor-container">
      <Show when={currentFile()} fallback={
        <div class="no-file-selected">
          <p>No file selected. Select a file from the explorer or create a new one.</p>
        </div>
      }>
        <div class="editor-toolbar">
          <span class="current-file-name">
            {currentFile()?.name}
          </span>
          <button onClick={saveCurrentFile}>Save</button>
        </div>
        
        <div class="monaco-editor-wrapper">
          <Editor
            height="90vh"
            language={editorLanguage()}
            value={editorContent()}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
            }}
            onKeyDown={handleEditorKeyDown}
          />
        </div>
      </Show>
      
      <Show when={showGenerateForm()}>
        <div class="generate-dialog">
          <h3>Generate Code</h3>
          <p>What would you like to generate?</p>
          <textarea
            value={prompt()}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            rows={4}
            placeholder="Describe the code you want to generate..."
          />
          <div class="generate-dialog-actions">
            <button onClick={handleGenerateCode} disabled={api().isGenerating}>
              {api().isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button onClick={() => setShowGenerateForm(false)}>Cancel</button>
          </div>
        </div>
      </Show>
      
      <Show when={api().lastGeneratedCode && currentFile()}>
        <div class="generated-code-preview">
          <h3>Generated Code</h3>
          <div class="generated-code-actions">
            <button onClick={insertGeneratedCode}>Insert at Cursor</button>
            <button onClick={() => {
              // Create a new file with the generated code
              const file = currentFile();
              if (file && file.parentId) {
                dispatch(
                  updateFile({
                    id: fileSystem().currentNodeId!,
                    content: editorContent() + '\n' + api().lastGeneratedCode
                  })
                );
              }
            }}>
              Append to Current File
            </button>
          </div>
          <pre class="generated-code">{api().lastGeneratedCode}</pre>
        </div>
      </Show>
    </div>
  );
}