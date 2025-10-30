<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let orientation: 'horizontal' | 'vertical' = 'horizontal';
	export let minSize = 200;
	export let maxSize = 800;
	export let initialSize = 320;
	export let disabled = false;
	export let className = '';

	const dispatch = createEventDispatcher();

	let isDragging = false;
	let startPosition = 0;
	let startSize = initialSize;
	let currentSize = initialSize;

	function handleMouseDown(event: MouseEvent) {
		if (disabled) return;

		isDragging = true;
		startPosition = orientation === 'horizontal' ? event.clientX : event.clientY;
		startSize = currentSize;

		dispatch('dragstart');

		document.body.style.userSelect = 'none';
		document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';
		document.body.classList.add('no-select');

		function handleMouseMove(event: MouseEvent) {
			if (!isDragging) return;

			const currentPosition = orientation === 'horizontal' ? event.clientX : event.clientY;
			const delta = currentPosition - startPosition;
			const newSize = Math.max(minSize, Math.min(maxSize, startSize + delta));

			if (newSize !== currentSize) {
				currentSize = newSize;
				dispatch('resize', { size: newSize });
			}
		}

		function handleMouseUp() {
			isDragging = false;
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			document.body.classList.remove('no-select');

			dispatch('dragend');

			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleTouchStart(event: TouchEvent) {
		if (disabled) return;

		isDragging = true;
		const touch = event.touches[0];
		startPosition = orientation === 'horizontal' ? touch.clientX : touch.clientY;
		startSize = currentSize;

		dispatch('dragstart');

		function handleTouchMove(event: TouchEvent) {
			if (!isDragging) return;

			event.preventDefault();
			const touch = event.touches[0];
			const currentPosition = orientation === 'horizontal' ? touch.clientX : touch.clientY;
			const delta = currentPosition - startPosition;
			const newSize = Math.max(minSize, Math.min(maxSize, startSize + delta));

			if (newSize !== currentSize) {
				currentSize = newSize;
				dispatch('resize', { size: newSize });
			}
		}

		function handleTouchEnd() {
			isDragging = false;
			dispatch('dragend');

			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);
		}

		document.addEventListener('touchmove', handleTouchMove, { passive: false });
		document.addEventListener('touchend', handleTouchEnd);
	}

	$: currentSize = initialSize;
</script>

<div
	class="tab-slider {className}"
	class:horizontal={orientation === 'horizontal'}
	class:vertical={orientation === 'vertical'}
	class:dragging={isDragging}
	class:disabled
	on:mousedown={handleMouseDown}
	on:touchstart={handleTouchStart}
	role="slider"
	aria-orientation={orientation}
	aria-valuenow={currentSize}
	aria-valuemin={minSize}
	aria-valuemax={maxSize}
	tabindex={disabled ? -1 : 0}
	on:keydown={(e) => {
		if (disabled) return;
		
		let delta = 0;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			delta = -10;
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			delta = 10;
		}
		
		if (delta !== 0) {
			e.preventDefault();
			const newSize = Math.max(minSize, Math.min(maxSize, currentSize + delta));
			currentSize = newSize;
			dispatch('resize', { size: newSize });
		}
	}}
>
	<div class="slider-handle">
		<div class="slider-grip"></div>
	</div>
</div>

<style>
	.tab-slider {
		position: relative;
		z-index: 10;
		transition: background-color 0.15s ease;
		background-color: transparent;
	}

	.tab-slider.horizontal {
		width: 4px;
		height: 100%;
		cursor: col-resize;
	}

	.tab-slider.vertical {
		width: 100%;
		height: 4px;
		cursor: row-resize;
	}

	.tab-slider::before {
		content: '';
		position: absolute;
		background-color: transparent;
		transition: background-color 0.15s ease;
	}

	.tab-slider.horizontal::before {
		top: 0;
		left: -4px;
		right: -4px;
		bottom: 0;
	}

	.tab-slider.vertical::before {
		top: -4px;
		left: 0;
		right: 0;
		bottom: -4px;
	}

	.tab-slider:hover:not(.disabled)::before {
		background-color: rgb(59 130 246 / 0.1);
	}

	.tab-slider:hover:not(.disabled) {
		background-color: rgb(59 130 246 / 0.3);
	}

	.tab-slider.dragging {
		background-color: rgb(59 130 246 / 0.5);
	}

	.tab-slider.dragging::before {
		background-color: rgb(59 130 246 / 0.2);
	}

	.tab-slider.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.slider-handle {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: transparent;
		transition: all 0.15s ease;
		border-radius: 4px;
	}

	.horizontal .slider-handle {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 16px;
		height: 48px;
		margin-left: -6px;
	}

	.vertical .slider-handle {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 48px;
		height: 16px;
		margin-top: -6px;
	}

	.tab-slider:hover:not(.disabled) .slider-handle {
		background-color: rgb(59 130 246 / 0.08);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.dragging .slider-handle {
		background-color: rgb(59 130 246 / 0.15);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		transform: translate(-50%, -50%) scale(1.05);
	}

	.slider-grip {
		background-color: rgb(156 163 175);
		border-radius: 2px;
		transition: all 0.15s ease;
	}

	.horizontal .slider-grip {
		width: 3px;
		height: 20px;
	}

	.vertical .slider-grip {
		width: 20px;
		height: 3px;
	}

	.tab-slider:hover:not(.disabled) .slider-grip {
		background-color: rgb(59 130 246);
		box-shadow: 0 0 4px rgba(59, 130, 246, 0.3);
	}

	.dragging .slider-grip {
		background-color: rgb(59 130 246);
		box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
	}

	/* Dark mode styles */
	:global(.dark) .slider-grip {
		background-color: rgb(107 114 128);
	}

	:global(.dark) .tab-slider:hover:not(.disabled) .slider-grip {
		background-color: rgb(96 165 250);
		box-shadow: 0 0 4px rgba(96, 165, 250, 0.4);
	}

	:global(.dark) .dragging .slider-grip {
		background-color: rgb(96 165 250);
		box-shadow: 0 0 6px rgba(96, 165, 250, 0.6);
	}

	:global(.dark) .tab-slider:hover:not(.disabled)::before {
		background-color: rgb(96 165 250 / 0.1);
	}

	:global(.dark) .tab-slider:hover:not(.disabled) {
		background-color: rgb(96 165 250 / 0.25);
	}

	:global(.dark) .tab-slider.dragging {
		background-color: rgb(96 165 250 / 0.4);
	}

	:global(.dark) .tab-slider.dragging::before {
		background-color: rgb(96 165 250 / 0.15);
	}

	:global(.dark) .tab-slider:hover:not(.disabled) .slider-handle {
		background-color: rgb(96 165 250 / 0.08);
	}

	:global(.dark) .dragging .slider-handle {
		background-color: rgb(96 165 250 / 0.12);
	}

	.tab-slider:focus {
		outline: 2px solid rgb(59 130 246);
		outline-offset: 2px;
	}

	.tab-slider:focus:not(:focus-visible) {
		outline: none;
	}

	:global(.dark) .tab-slider:focus {
		outline-color: rgb(96 165 250);
	}

	.tab-slider * {
		will-change: transform;
	}
</style>