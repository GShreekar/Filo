import { initializeApp } from 'firebase/app';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Persists Firestore's own write queue and read cache to IndexedDB, so a
// write made while offline survives even a closed tab and syncs once
// reconnected — auto-save.ts used to hand-roll a much weaker version of
// this (an in-memory retry timer, lost on refresh) instead of relying on
// what the SDK already does. persistentMultipleTabManager coordinates that
// cache across however many tabs of the app happen to be open, rather than
// silently falling back to memory-only in every tab after the first.
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
export const functions = getFunctions(app);

export const googleProvider = new GoogleAuthProvider();

// Skips the account chooser when only one account has ever been used here.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Opt-in, not automatic: connecting unconditionally in dev meant PDF export
// was broken under `npm run dev` unless the emulator happened to already be
// running. Without this flag, dev talks to the real deployed function, same
// as production.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
	try {
		connectFunctionsEmulator(functions, 'localhost', 5001);
	} catch (error) {
		console.warn('Functions emulator connection:', error);
	}
}
