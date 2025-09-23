export type { Folder, Note, SearchResult } from './types';

export { 
  folders, 
  notes, 
  selectedNote, 
  selectedFolder, 
  searchQuery, 
  darkMode, 
  sidebarCollapsed 
} from './stores';

export {
  errors,
  isLoading,
  isSaving,
  showError,
  clearError,
  clearAllErrors
} from './error-store';

export {
  autoSaveState,
  scheduleContentSave,
  scheduleTitleSave,
  clearAutoSaveState,
  saveCurrentNote,
  saveCurrentNoteIfDirty,
  setInitialNoteState,
  isDirty,
  isContentDirty,
  isTitleDirty,
  getCurrentNoteId
} from './auto-save';

export {
  createFolder,
  updateFolder,
  deleteFolder,
  createNote,
  updateNote,
  deleteNote,
  subscribeFolders,
  subscribeNotes
} from './firebase-service';

export { searchNotes, highlightText } from './search-service';

export { default as ContextMenu } from './components/ContextMenu.svelte';
export { default as ConfirmModal } from './components/ConfirmModal.svelte';
export { default as InputModal } from './components/InputModal.svelte';
export { default as EmptyState } from './components/EmptyState.svelte';
export { default as ErrorToast } from './components/ErrorToast.svelte';
export { default as LoadingSpinner } from './components/LoadingSpinner.svelte';
