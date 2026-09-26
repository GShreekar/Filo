// Shared focus management for modal dialogs (ConfirmModal, InputModal,
// ExportModal, ImportModal, HelpModal) — none of them trapped Tab inside the
// dialog, moved focus in on open, or restored it on close. Applied via
// `use:trapFocus` on each dialog's role="dialog" element; since these are all
// behind {#if visible}, the element's own mount/destroy lifecycle already
// matches "dialog opened"/"dialog closed", so a Svelte action is a natural
// fit — no need to separately watch a `visible` prop here.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) => el.offsetParent !== null
	);
}

export function trapFocus(container: HTMLElement) {
	const previouslyFocused = document.activeElement as HTMLElement | null;

	// Deferred a frame so the dialog's content has actually painted (and so a
	// component's own more specific focus logic — e.g. InputModal selecting
	// its text field — gets first say; this only fills in when nothing inside
	// has claimed focus yet).
	requestAnimationFrame(() => {
		if (container.contains(document.activeElement)) return;

		const initial =
			container.querySelector<HTMLElement>('[data-autofocus]') ??
			getFocusable(container)[0] ??
			container;
		initial.focus();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const focusable = getFocusable(container);
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	container.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			container.removeEventListener('keydown', handleKeydown);
			// Whatever triggered the dialog (e.g. a "Delete" button in a
			// context menu) may itself no longer be in the document —
			// restoring focus to it in that case would be a no-op anyway,
			// document.contains() just avoids calling focus() on a detached
			// element for no reason.
			if (previouslyFocused && document.contains(previouslyFocused)) {
				previouslyFocused.focus();
			}
		}
	};
}
