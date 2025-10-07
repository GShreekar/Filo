<script lang="ts">
	import { errors, clearError } from '$lib/error-store';
	import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import type { AppError } from '$lib/error-store';
	import { onMount } from 'svelte';

	$: currentErrors = $errors;
	$: visibleErrors = currentErrors.slice(0, 2);
	$: hiddenCount = Math.max(0, currentErrors.length - 2);

	let isMobile = false;
	let pointerStartX = 0;
	let pointerStartY = 0;
	let isDragging = false;
	let dragDistance = 0;
	let dragDirection: 'horizontal' | 'vertical' | null = null;
	let swipeThreshold = 50;
	let draggedToastId: string | null = null;
	let capturedPointerId: number | null = null;

	$: getTransformStyle = (errorId: string) => {
		let baseStyle = 'touch-action: none;';

		if (draggedToastId === errorId && isDragging && dragDistance > 0) {
			const scale = Math.max(0.95, 1 - dragDistance / 200);
			const opacity = Math.max(0.6, 1 - dragDistance / 100);
			const blur = dragDistance > swipeThreshold * 0.5 ? 'blur(1px)' : 'none';

			let transform = '';
			if (dragDirection === 'horizontal') {
				const translateX = dragDistance;
				transform = `translateX(${translateX}px) scale(${scale})`;
			} else if (dragDirection === 'vertical') {
				const translateY = dragDistance;
				transform = `translateY(${translateY}px) scale(${scale})`;
			}

			baseStyle += ` transform: ${transform}; opacity: ${opacity}; filter: ${blur};`;
		}

		return baseStyle;
	};

	let dragTimeout: ReturnType<typeof setTimeout>;
	$: if (isDragging) {
		clearTimeout(dragTimeout);
		dragTimeout = setTimeout(() => {
			if (isDragging) {
				isDragging = false;
				draggedToastId = null;
				dragDistance = 0;
				dragDirection = null;
				capturedPointerId = null;
			}
		}, 3000);
	}

	onMount(() => {
		const checkMobile = () => {
			const wasMobile = isMobile;
			isMobile = window.innerWidth < 768;
			if (wasMobile !== isMobile) {
				isDragging = false;
				draggedToastId = null;
				dragDistance = 0;
				dragDirection = null;
				capturedPointerId = null;
			}
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	function getIcon(type: AppError['type']) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'warning':
				return AlertTriangle;
			default:
				return AlertCircle;
		}
	}

	function getColorClasses(type: AppError['type']) {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
			default:
				return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
		}
	}

	function getAriaLabel(type: AppError['type'], message: string) {
		const prefix = type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Error';
		return `${prefix}: ${message}`;
	}

	function handlePointerDown(event: PointerEvent, errorId: string) {
		if (!isMobile) return;
		pointerStartX = event.clientX;
		pointerStartY = event.clientY;
		isDragging = false;
		dragDistance = 0;
		dragDirection = null;
		draggedToastId = errorId;
		capturedPointerId = event.pointerId;

		const target = event.currentTarget as HTMLElement;
		target.setPointerCapture(event.pointerId);

		event.preventDefault();
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isMobile || !draggedToastId || event.pointerId !== capturedPointerId) return;

		const currentX = event.clientX;
		const currentY = event.clientY;
		const deltaX = currentX - pointerStartX;
		const deltaY = currentY - pointerStartY;

		if (!dragDirection && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
			dragDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
		}

		if (dragDirection === 'horizontal') {
			const distance = Math.abs(deltaX);
			if (distance > 5) {
				isDragging = true;
				dragDistance = Math.min(distance * 0.8, 120);
				event.preventDefault();

				if (distance > swipeThreshold) {
					clearError(draggedToastId);
					isDragging = false;
					draggedToastId = null;
					dragDistance = 0;
					dragDirection = null;
					capturedPointerId = null;
				}
			}
		} else if (dragDirection === 'vertical' && deltaY > 0) {
			isDragging = true;
			dragDistance = Math.min(deltaY * 0.8, 120);
			event.preventDefault();

			if (deltaY > swipeThreshold) {
				clearError(draggedToastId);
				isDragging = false;
				draggedToastId = null;
				dragDistance = 0;
				dragDirection = null;
				capturedPointerId = null;
			}
		}
	}

	function handlePointerUp(event: PointerEvent, errorId: string) {
		if (
			!isMobile ||
			!draggedToastId ||
			errorId !== draggedToastId ||
			event.pointerId !== capturedPointerId
		)
			return;

		const target = event.currentTarget as HTMLElement;
		if (capturedPointerId !== null) {
			target.releasePointerCapture(capturedPointerId);
		}

		if (isDragging && draggedToastId === errorId) {
			target.style.transform = '';
			target.style.opacity = '';
			target.style.filter = '';
			target.style.transition =
				'transform 0.2s ease-out, opacity 0.2s ease-out, filter 0.2s ease-out';

			setTimeout(() => {
				target.style.transition = '';
			}, 200);
		}

		isDragging = false;
		draggedToastId = null;
		dragDistance = 0;
		dragDirection = null;
		capturedPointerId = null;
	}

	function handleKeydown(event: KeyboardEvent, errorId: string) {
		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
			event.preventDefault();
			clearError(errorId);
		}
	}
</script>

<div
	class="fixed top-4 right-4
		z-50 max-w-md space-y-2
		max-md:inset-x-4 max-md:top-auto max-md:right-auto max-md:bottom-4 max-md:max-w-none
		max-md:pr-[env(safe-area-inset-right)] max-md:pb-[env(safe-area-inset-bottom)] max-md:pl-[env(safe-area-inset-left)]"
	role="region"
	aria-live="assertive"
	aria-label="Notifications"
>
	{#each visibleErrors as error (error.id)}
		<button
			type="button"
			class="flex w-full items-center gap-3 rounded-lg border p-4 text-left shadow-lg
				{getColorClasses(error.type)}
				{isMobile ? 'animate-in slide-in-from-bottom-4' : 'animate-in slide-in-from-right-4'}
				max-w-[calc(100vw-2rem)]
				select-none focus:ring-2
				focus:ring-blue-500 focus:ring-offset-2 focus:outline-none md:max-w-md
				{draggedToastId === error.id && isDragging ? '' : 'transition-all duration-300'}"
			style={getTransformStyle(error.id)}
			aria-label={getAriaLabel(error.type, error.message)}
			on:click={() => clearError(error.id)}
			on:keydown={(e) => handleKeydown(e, error.id)}
			on:pointerdown={(e) => handlePointerDown(e, error.id)}
			on:pointermove={handlePointerMove}
			on:pointerup={(e) => handlePointerUp(e, error.id)}
			on:pointercancel={(e) => handlePointerUp(e, error.id)}
		>
			<div role="alert" aria-live="assertive" class="flex w-full items-center gap-3">
				<svelte:component this={getIcon(error.type)} class="h-5 w-5 flex-shrink-0" />

				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium break-words">
						{error.message}
					</p>
					<p class="mt-1 text-xs opacity-75">
						{error.timestamp.toLocaleTimeString()}
					</p>
					{#if isMobile}
						<p class="mt-1 text-xs opacity-60">Swipe to dismiss</p>
					{/if}
				</div>
			</div>

			<div
				class="flex-shrink-0 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10
					{isMobile ? 'p-2' : 'p-1'}"
				aria-hidden="true"
			>
				<X class={isMobile ? 'h-5 w-5' : 'h-4 w-4'} />
			</div>
		</button>
	{/each}

	{#if hiddenCount > 0}
		<div
			class="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300
				{isMobile ? 'animate-in slide-in-from-bottom-4' : 'animate-in slide-in-from-right-4'}"
		>
			<AlertCircle class="h-4 w-4" />
			<span>+{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}</span>
		</div>
	{/if}
</div>
