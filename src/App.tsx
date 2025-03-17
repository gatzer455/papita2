import { createEffect, onMount } from 'solid-js';
import { useAppDispatch } from './hooks/store';
import { AppDispatch } from './store/store';
import { initializeFS } from './store/fileSystemSlice';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Settings from './components/Settings';
import './App.css';

export default function App() {
  const dispatch = useAppDispatch();
  
  // Initialize the file system on mount
  onMount(() => {
    dispatch(initializeFS());
  });
  
  return (
    <div class="app">
      <header class="app-header">
        <h1>Papita2 Code Editor</h1>
        <Settings />
      </header>
      
      <main class="app-content">
        <aside class="sidebar">
          <FileExplorer />
        </aside>
        
        <section class="editor-area">
          <CodeEditor />
        </section>
      </main>
      
      <footer class="app-footer">
        <p>Powered by Tauri + SolidJS + Claude</p>
      </footer>
    </div>
  );
}