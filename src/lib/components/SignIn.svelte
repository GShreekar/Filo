<script lang="ts">
	import { FileText, LogIn, ShieldAlert } from 'lucide-svelte';
	import { signInWithGoogle, accessDenied } from '$lib/auth';

	let isSigningIn = false;

	async function handleSignIn() {
		isSigningIn = true;
		try {
			await signInWithGoogle();
		} finally {
			isSigningIn = false;
		}
	}
</script>

<div class="flex h-full items-center justify-center p-8">
	<div class="w-full max-w-sm text-center">
		<FileText class="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />

		<h1 class="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">Filo</h1>
		<p class="mb-8 text-gray-600 dark:text-gray-400">Sign in to open your notes.</p>

		{#if $accessDenied}
			<div
				class="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-800 dark:bg-red-900/20"
			>
				<ShieldAlert class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
				<div class="text-sm text-red-800 dark:text-red-200">
					<p class="font-medium">This account isn't allowed here.</p>
					<p class="mt-1">This is a private deployment. Sign in with an approved account.</p>
				</div>
			</div>
		{/if}

		<button
			on:click={handleSignIn}
			disabled={isSigningIn}
			class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{#if isSigningIn}
				<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
				<span>Signing in...</span>
			{:else}
				<LogIn class="h-4 w-4" />
				<span>Continue with Google</span>
			{/if}
		</button>
	</div>
</div>
