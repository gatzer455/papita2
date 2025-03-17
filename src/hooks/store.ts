import { createSignal, onCleanup, createMemo } from 'solid-js';
import { AppDispatch, RootState } from '../store/store';
import store from '../store/store';

// Custom hook to use Redux store in SolidJS
export function useStore<T>(selector: (state: RootState) => T): () => T {
  const [state, setState] = createSignal(selector(store.getState()));

  const unsubscribe = store.subscribe(() => {
    setState(selector(store.getState()));
  });

  onCleanup(() => {
    unsubscribe();
  });

  return createMemo(() => state());
}

// Hook to get dispatch function
export function useAppDispatch(): AppDispatch {
  return store.dispatch;
}