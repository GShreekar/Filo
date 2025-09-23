import { writable, get } from 'svelte/store';
import { updateNote } from './firebase-service';

interface AutoSaveState {
  noteId: string | null;
  content: string;
  title: string;
  contentDirty: boolean;
  titleDirty: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
}

export const autoSaveState = writable<AutoSaveState>({
  noteId: null,
  content: '',
  title: '',
  contentDirty: false,
  titleDirty: false,
  lastSaved: null,
  isSaving: false
});

let debounceTimer: NodeJS.Timeout;
let titleDebounceTimer: NodeJS.Timeout;

async function performSave(noteId: string, silent: boolean = false): Promise<void> {
  if (!silent) {
    autoSaveState.update(state => ({ ...state, isSaving: true }));
  }

  try {
    const state = get(autoSaveState);
    const update: any = {};
    
    if (state.contentDirty) update.content = state.content;
    if (state.titleDirty) update.title = state.title;

    if (Object.keys(update).length > 0) {
      await updateNote(noteId, update);
    }

    autoSaveState.update(state => ({
      ...state,
      contentDirty: false,
      titleDirty: false,
      lastSaved: new Date(),
      isSaving: false
    }));
  } catch (error) {
    console.error("Save failed:", error);
    autoSaveState.update(state => ({ ...state, isSaving: false }));
    throw error;
  }
}

export function scheduleContentSave(noteId: string, content: string) {
  clearTimeout(debounceTimer);
  
  autoSaveState.update(state => ({
    ...state,
    noteId,
    content,
    contentDirty: true
  }));
  
  debounceTimer = setTimeout(() => performSave(noteId), 1500);
}

export function scheduleTitleSave(noteId: string, title: string) {
  clearTimeout(titleDebounceTimer);
  
  autoSaveState.update(state => ({
    ...state,
    noteId,
    title,
    titleDirty: true
  }));
  
  titleDebounceTimer = setTimeout(() => performSave(noteId), 2000);
}

export async function saveCurrentNote(noteId: string, content: string): Promise<void> {
  clearTimeout(debounceTimer);
  clearTimeout(titleDebounceTimer);
  
  const currentState = get(autoSaveState);
  if (currentState.content !== content) {
    autoSaveState.update(state => ({
      ...state,
      content,
      contentDirty: true
    }));
  }
  
  await performSave(noteId);
}

export async function saveCurrentNoteIfDirty(noteId: string, content?: string): Promise<void> {
  const state = get(autoSaveState);
  
  if ((state.contentDirty || state.titleDirty) && state.noteId === noteId) {
    if (content !== undefined && state.content !== content) {
      autoSaveState.update(s => ({
        ...s,
        content,
        contentDirty: true
      }));
    }
    
    await performSave(noteId, true);
  }
}

export function clearAutoSaveState() {
  clearTimeout(debounceTimer);
  clearTimeout(titleDebounceTimer);
  
  autoSaveState.set({
    noteId: null,
    content: '',
    title: '',
    contentDirty: false,
    titleDirty: false,
    lastSaved: null,
    isSaving: false
  });
}

export async function setInitialNoteState(noteId: string, content: string, title: string) {
  const currentState = get(autoSaveState);
  if (currentState.noteId && currentState.noteId !== noteId) {
    await saveCurrentNoteIfDirty(currentState.noteId);
  }
  
  clearTimeout(debounceTimer);
  clearTimeout(titleDebounceTimer);
  
  autoSaveState.set({
    noteId,
    content,
    title,
    contentDirty: false,
    titleDirty: false,
    lastSaved: null,
    isSaving: false
  });
}

export function isDirty(): boolean {
  const state = get(autoSaveState);
  return state.contentDirty || state.titleDirty;
}

export function isContentDirty(): boolean {
  const state = get(autoSaveState);
  return state.contentDirty;
}

export function isTitleDirty(): boolean {
  const state = get(autoSaveState);
  return state.titleDirty;
}

export function getCurrentNoteId(): string | null {
  const state = get(autoSaveState);
  return state.noteId;
}