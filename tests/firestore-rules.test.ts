import { readFileSync } from 'node:fs';
import {
	initializeTestEnvironment,
	assertFails,
	assertSucceeds,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
	doc,
	getDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	Timestamp,
	setLogLevel
} from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';

const OWNER_UID = 'owner-uid';
const STRANGER_UID = 'stranger-uid';
const UNVERIFIED_UID = 'unverified-uid';

const OWNER = { email: 'gsbksirsi@gmail.com', email_verified: true };
const STRANGER = { email: 'someone.else@gmail.com', email_verified: true };
const UNVERIFIED = { email: 'gsbksirsi@gmail.com', email_verified: false };

let env: RulesTestEnvironment;

beforeAll(async () => {
	setLogLevel('error');
	env = await initializeTestEnvironment({
		projectId: 'demo-filo',
		firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
	});
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
	await env.clearFirestore();
	await env.withSecurityRulesDisabled(async (ctx) => {
		await setDoc(doc(ctx.firestore(), 'notes/owned'), {
			title: 'Mine',
			folderId: null,
			ownerId: OWNER_UID,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now()
		});
		await setDoc(doc(ctx.firestore(), 'noteContents/owned'), {
			content: 'body text',
			ownerId: OWNER_UID
		});
		await setDoc(doc(ctx.firestore(), 'folders/owned'), {
			name: 'Mine',
			parentId: null,
			ownerId: OWNER_UID,
			createdAt: Timestamp.now()
		});
	});
});

// Shaped exactly like createNote()'s metadata write in firebase-service.ts —
// content lives in a separate noteContents doc (2.12), not here.
const note = (ownerId: string, overrides: Record<string, unknown> = {}) => ({
	title: 'n',
	folderId: null,
	ownerId,
	createdAt: Timestamp.now(),
	updatedAt: Timestamp.now(),
	...overrides
});

// Shaped exactly like createNote()'s content write.
const noteContent = (ownerId: string, overrides: Record<string, unknown> = {}) => ({
	content: '',
	ownerId,
	...overrides
});

// Shaped exactly like createFolder()'s payload.
const folder = (ownerId: string, overrides: Record<string, unknown> = {}) => ({
	name: 'f',
	parentId: null,
	ownerId,
	createdAt: Timestamp.now(),
	...overrides
});

describe('the allowlisted owner — notes (metadata)', () => {
	test('reads and writes their own notes', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertSucceeds(getDoc(doc(db, 'notes/owned')));
		await assertSucceeds(setDoc(doc(db, 'notes/new'), note(OWNER_UID)));
		await assertSucceeds(deleteDoc(doc(db, 'notes/owned')));
	});

	test('cannot create a note owned by someone else', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'notes/theirs'), note(STRANGER_UID)));
	});

	test('partial updates shaped like the real app (title, move) succeed', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertSucceeds(
			updateDoc(doc(db, 'notes/owned'), { title: 'New title', updatedAt: Timestamp.now() })
		);
		await assertSucceeds(
			updateDoc(doc(db, 'notes/owned'), { folderId: 'some-folder', updatedAt: Timestamp.now() })
		);
	});

	test('rejects a content field — that belongs on noteContents now', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'notes/bad'), note(OWNER_UID, { content: 'nope' })));
		await assertFails(updateDoc(doc(db, 'notes/owned'), { content: 'nope' }));
	});

	test('rejects an unexpected extra field', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'notes/bad'), note(OWNER_UID, { isAdmin: true })));
	});

	test('rejects an oversized title', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'notes/bad'), note(OWNER_UID, { title: 'x'.repeat(301) })));
	});

	test('rejects an empty title', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'notes/bad'), note(OWNER_UID, { title: '' })));
	});

	test('rejects rewriting createdAt on update', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(updateDoc(doc(db, 'notes/owned'), { createdAt: Timestamp.now() }));
	});
});

describe('the allowlisted owner — note contents', () => {
	test('reads and writes their own note content', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertSucceeds(getDoc(doc(db, 'noteContents/owned')));
		await assertSucceeds(setDoc(doc(db, 'noteContents/new'), noteContent(OWNER_UID)));
		await assertSucceeds(updateDoc(doc(db, 'noteContents/owned'), { content: 'edited' }));
		await assertSucceeds(deleteDoc(doc(db, 'noteContents/owned')));
	});

	test('cannot create content owned by someone else', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'noteContents/theirs'), noteContent(STRANGER_UID)));
	});

	test('rejects a wrong-typed content field', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(
			setDoc(doc(db, 'noteContents/bad'), noteContent(OWNER_UID, { content: 12345 }))
		);
	});

	test('rejects an unexpected extra field', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(
			setDoc(doc(db, 'noteContents/bad'), noteContent(OWNER_UID, { title: 'sneaking in' }))
		);
	});

	test('rejects oversized content', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(
			setDoc(doc(db, 'noteContents/bad'), noteContent(OWNER_UID, { content: 'x'.repeat(900001) }))
		);
	});
});

describe('the allowlisted owner — folders', () => {
	test('creates and renames their own folder', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertSucceeds(setDoc(doc(db, 'folders/new'), folder(OWNER_UID)));
		await assertSucceeds(updateDoc(doc(db, 'folders/owned'), { name: 'Renamed' }));
	});

	test('rejects a folder with a wrong-typed parentId', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'folders/bad'), folder(OWNER_UID, { parentId: 123 })));
	});

	test('rejects an empty folder name', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'folders/bad'), folder(OWNER_UID, { name: '' })));
	});
});

describe('everyone else', () => {
	test('a signed-out visitor is denied', async () => {
		const db = env.unauthenticatedContext().firestore();
		await assertFails(getDoc(doc(db, 'notes/owned')));
		await assertFails(getDoc(doc(db, 'noteContents/owned')));
		await assertFails(setDoc(doc(db, 'notes/new'), note('anyone')));
	});

	test('a signed-in Google user not on the allowlist is denied', async () => {
		const db = env.authenticatedContext(STRANGER_UID, STRANGER).firestore();
		await assertFails(getDoc(doc(db, 'notes/owned')));
		await assertFails(getDoc(doc(db, 'noteContents/owned')));
		await assertFails(setDoc(doc(db, 'notes/new'), note(STRANGER_UID)));
	});

	test('an unverified address matching the allowlist is denied', async () => {
		const db = env.authenticatedContext(UNVERIFIED_UID, UNVERIFIED).firestore();
		await assertFails(getDoc(doc(db, 'notes/owned')));
	});

	test('other collections are closed', async () => {
		const db = env.authenticatedContext(OWNER_UID, OWNER).firestore();
		await assertFails(setDoc(doc(db, 'secrets/x'), { ownerId: OWNER_UID }));
	});
});
