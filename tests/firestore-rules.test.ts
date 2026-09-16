import { readFileSync } from 'node:fs';
import {
	initializeTestEnvironment,
	assertFails,
	assertSucceeds,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, setLogLevel } from 'firebase/firestore';
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
			content: '',
			folderId: null,
			ownerId: OWNER_UID
		});
	});
});

const note = (ownerId: string) => ({ title: 'n', content: '', folderId: null, ownerId });

describe('the allowlisted owner', () => {
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
});

describe('everyone else', () => {
	test('a signed-out visitor is denied', async () => {
		const db = env.unauthenticatedContext().firestore();
		await assertFails(getDoc(doc(db, 'notes/owned')));
		await assertFails(setDoc(doc(db, 'notes/new'), note('anyone')));
	});

	test('a signed-in Google user not on the allowlist is denied', async () => {
		const db = env.authenticatedContext(STRANGER_UID, STRANGER).firestore();
		await assertFails(getDoc(doc(db, 'notes/owned')));
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
