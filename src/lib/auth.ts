import {
	signInWithPopup,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	setPersistence,
	browserLocalPersistence,
	type User
} from 'firebase/auth';
import { get, writable } from 'svelte/store';
import { auth, googleProvider } from './firebase';
import { showError } from './error-store';

// Accounts permitted to use this deployment. Firestore rules enforce the same
// list server-side; this copy only decides what the UI shows. An empty list
// means the client does not filter and the rules are the only gate.
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS ?? '')
	.split(',')
	.map((email: string) => email.trim().toLowerCase())
	.filter(Boolean);

export const currentUser = writable<User | null>(null);

// False until the first onAuthStateChanged fires, so the UI can avoid flashing
// the sign-in screen at someone who already has a session.
export const authReady = writable(false);

// Set when a real Google account signed in but is not on the allowlist.
export const accessDenied = writable(false);

export function isAllowedUser(user: User | null): boolean {
	if (!user?.email || !user.emailVerified) return false;
	if (ALLOWED_EMAILS.length === 0) return true;
	return ALLOWED_EMAILS.includes(user.email.toLowerCase());
}

export function initAuth(): () => void {
	setPersistence(auth, browserLocalPersistence).catch((error) => {
		console.error('Failed to set auth persistence:', error);
	});

	return onAuthStateChanged(
		auth,
		(user) => {
			if (user && !isAllowedUser(user)) {
				accessDenied.set(true);
				currentUser.set(null);
				firebaseSignOut(auth).catch(() => {});
			} else {
				accessDenied.set(false);
				currentUser.set(user);
			}
			authReady.set(true);
		},
		(error) => {
			console.error('Auth state error:', error);
			showError('Authentication failed. Please reload the page.');
			authReady.set(true);
		}
	);
}

export async function signInWithGoogle(): Promise<void> {
	try {
		accessDenied.set(false);
		const result = await signInWithPopup(auth, googleProvider);

		if (!isAllowedUser(result.user)) {
			await firebaseSignOut(auth);
			accessDenied.set(true);
			currentUser.set(null);
		}
	} catch (error) {
		const code = (error as { code?: string })?.code;

		// The user closing the popup is not worth a toast.
		if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
			return;
		}

		console.error('Sign-in failed:', error);

		if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
			accessDenied.set(true);
		} else if (code === 'auth/popup-blocked') {
			showError('Your browser blocked the sign-in popup. Allow popups and try again.');
		} else {
			showError('Sign-in failed. Please try again.');
		}
	}
}

export async function signOut(): Promise<void> {
	try {
		await firebaseSignOut(auth);
		currentUser.set(null);
		accessDenied.set(false);
	} catch (error) {
		console.error('Sign-out failed:', error);
		showError('Sign-out failed. Please try again.');
	}
}

export function getCurrentUserId(): string | null {
	return get(currentUser)?.uid ?? null;
}

// Throws rather than writing an unowned document, which the rules would reject
// anyway — this just fails earlier with a readable message.
export function requireUserId(): string {
	const uid = getCurrentUserId();
	if (!uid) throw new Error('You must be signed in to do that.');
	return uid;
}
