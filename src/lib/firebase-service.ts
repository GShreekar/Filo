import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import type { Folder, Note } from './types';
import { folders, notes } from './stores';
import { showError, isLoading, isSaving } from './error-store';

export async function createFolder(name: string): Promise<string> {
  try {
    isLoading.set(true);
    const docRef = await addDoc(collection(db, 'folders'), {
      name,
      createdAt: Timestamp.now()
    });
    showError(`Folder "${name}" created successfully`, 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    showError('Failed to create folder. Please try again.');
    throw error;
  } finally {
    isLoading.set(false);
  }
}

export async function updateFolder(id: string, name: string): Promise<void> {
  try {
    isSaving.set(true);
    await updateDoc(doc(db, 'folders', id), {
      name
    });
    showError('Folder renamed successfully', 'success');
  } catch (error) {
    console.error('Error updating folder:', error);
    showError('Failed to rename folder. Please try again.');
    throw error;
  } finally {
    isSaving.set(false);
  }
}

export async function deleteFolder(id: string): Promise<void> {
  try {
    isLoading.set(true);
    
    const notesQuery = query(collection(db, 'notes'), where('folderId', '==', id));
    const notesSnapshot = await getDocs(notesQuery);
    
    const deletePromises = notesSnapshot.docs.map(noteDoc => 
      deleteDoc(doc(db, 'notes', noteDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    await deleteDoc(doc(db, 'folders', id));
    
    showError('Folder and all its notes deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting folder:', error);
    showError('Failed to delete folder. Please try again.');
    throw error;
  } finally {
    isLoading.set(false);
  }
}

export async function createNote(folderId: string | null, title: string, content: string = ''): Promise<string> {
  try {
    isLoading.set(true);
    const docRef = await addDoc(collection(db, 'notes'), {
      title,
      content,
      folderId: folderId || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    showError(`Note "${title}" created successfully`, 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating note:', error);
    showError('Failed to create note. Please try again.');
    throw error;
  } finally {
    isLoading.set(false);
  }
}

export async function updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): Promise<void> {
  try {
    isSaving.set(true);
    await updateDoc(doc(db, 'notes', id), {
      ...updates,
      updatedAt: Timestamp.now()
    });
    if (updates.title) {
      showError('Note updated successfully', 'success');
    }
  } catch (error) {
    console.error('Error updating note:', error);
    showError('Failed to update note. Changes may be lost.');
    throw error;
  } finally {
    isSaving.set(false);
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    isLoading.set(true);
    await deleteDoc(doc(db, 'notes', id));
    showError('Note deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting note:', error);
    showError('Failed to delete note. Please try again.');
    throw error;
  } finally {
    isLoading.set(false);
  }
}

export function subscribeFolders() {
  try {
    const q = query(collection(db, 'folders'), orderBy('createdAt', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const folderData: Folder[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        createdAt: doc.data().createdAt.toDate()
      }));
      folders.set(folderData);
    }, (error) => {
      console.error('Error listening to folders:', error);
      showError('Lost connection to folders. Please refresh the page.');
    });
  } catch (error) {
    console.error('Error setting up folders listener:', error);
    showError('Failed to load folders. Please refresh the page.');
    return () => {};
  }
}

export function subscribeNotes() {
  try {
    const q = query(collection(db, 'notes'), orderBy('updatedAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const noteData: Note[] = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        folderId: doc.data().folderId,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      }));
      notes.set(noteData);
    }, (error) => {
      console.error('Error listening to notes:', error);
      showError('Lost connection to notes. Please refresh the page.');
    });
  } catch (error) {
    console.error('Error setting up notes listener:', error);
    showError('Failed to load notes. Please refresh the page.');
    return () => {};
  }
}