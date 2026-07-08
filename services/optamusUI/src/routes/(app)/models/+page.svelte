<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getDirectoryModels } from '$lib/apis/models';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');

	// ── State ────────────────────────────────────────────────────────────────────
	let loaded = false;
	let loading = false;
	let searchQuery = '';
	let activeTag = 'All';
	const tags = ['All', 'Text', 'Image', 'Vision', 'Programming', 'OpenAI', 'Anthropic', 'Google', 'Meta'];

	let models: any[] = [];

	// ── Derived / Reactive ───────────────────────────────────────────────────────
	$: filteredModels = models.filter((m) => {
		const matchesSearch =
			m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.id.toLowerCase().includes(searchQuery.toLowerCase());

		let matchesTag = true;
		if (activeTag === 'Vision') {
			matchesTag = m.capabilities?.vision;
		} else if (activeTag === 'Programming') {
			matchesTag = m.capabilities?.function_calling;
		} else if (['OpenAI', 'Anthropic', 'Google', 'Meta'].includes(activeTag)) {
			matchesTag = m.provider === activeTag;
		}

		return matchesSearch && matchesTag;
	});

	// ── Lifecycle ────────────────────────────────────────────────────────────────
	onMount(async () => {
		loading = true;
		const res = await getDirectoryModels(localStorage.token).catch((e) => {
			toast.error(e || $i18n.t('Failed to load models'));
			return [];
		});
		if (res) {
			models = res;
		}
		loading = false;
		loaded = true;
	});

	function copySlug(slug: string) {
		navigator.clipboard.writeText(slug);
		toast.success($i18n.t(`Copied ${slug}`));
	}
</script>

<div class="w-full h-full overflow-y-auto">
	<div class="max-w-[1000px] mx-auto px-6 py-12 flex flex-col gap-8">
		
		<!-- Header -->
		<div class="flex flex-col gap-2">
			<h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Models</h1>
			<p class="text-[15px] text-gray-500 dark:text-gray-400 max-w-2xl">
				Discover and review AI models. Share your experiences to help others find the right fit.
			</p>
		</div>

		<!-- Search Bar -->
		<div class="relative w-full">
			<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4.5 text-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
			</div>
			<input 
				type="text" 
				bind:value={searchQuery}
				placeholder="Search models..." 
				class="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 rounded-2xl text-[15px] text-gray-900 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500" 
			/>
		</div>

		<!-- Tags Navigation -->
		<div class="flex flex-wrap items-center gap-6 border-b border-gray-200 dark:border-gray-800 pb-4">
			{#each tags as tag}
				<button 
					class="text-[14px] font-medium transition-colors {activeTag === tag ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
					on:click={() => (activeTag = tag)}
				>
					{tag === 'All' ? 'All Tags' : tag}
				</button>
			{/each}
			<div class="ml-auto text-sm text-gray-500 flex items-center gap-1 cursor-pointer hover:text-gray-900 dark:hover:text-white transition">
				Most Reviewed
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
			</div>
		</div>

		<!-- List View -->
		{#if loading}
			<div class="flex justify-center items-center py-32">
				<Spinner />
			</div>
		{:else if loaded}
			<div class="flex flex-col">
				{#each filteredModels as model, idx}
					<a href={`/models/${model.id}`} class="flex items-start gap-5 py-6 border-b border-gray-100 dark:border-gray-800 group hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 rounded-xl transition-colors cursor-pointer block">
						
						<!-- Large Icon -->
						<div class="shrink-0">
							{#if model.provider === 'Anthropic'}
								<div class="size-[60px] rounded-[16px] bg-[#d97757] flex items-center justify-center p-2.5">
									<svg viewBox="0 0 24 24" fill="white" class="w-full h-full"><path d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z"/></svg>
								</div>
							{:else if model.provider === 'OpenAI'}
								<div class="size-[60px] rounded-[16px] bg-white flex items-center justify-center p-1.5">
									<svg viewBox="0 0 24 24" fill="black" class="w-full h-full"><path d="M22.28 11.66c.14-1.39-.23-2.79-1.02-3.92-.79-1.12-1.99-1.92-3.34-2.22-.39-1.34-1.19-2.54-2.31-3.33-1.12-.79-2.52-1.16-3.92-1.02-1.4-.14-2.8.23-3.92 1.02-1.12.79-1.92 1.99-2.31 3.33-1.35.3-2.55 1.1-3.34 2.22-.79 1.13-1.16 2.53-1.02 3.92-.14 1.4.23 2.8 1.02 3.92.79 1.12 1.99 1.92 3.34 2.22.39 1.34 1.19 2.54 2.31 3.33 1.12.79 2.52 1.16 3.92 1.02 1.39.14 2.79-.23 3.92-1.02 1.12-.79 1.92-1.99 2.31-3.33 1.35-.3 2.55-1.1 3.34-2.22.79-1.13 1.16-2.53 1.02-3.92zm-12.8 9.07c-.96 0-1.87-.33-2.61-.92L11 17.5v-5.2l-4.5 2.6v5.2c.5.3 1.06.46 1.63.46l4.15-4.15v2.87zm-4.32-2.12l4.15-2.4V11l-4.5-2.6-4.5 2.6v5.2l4.15 2.4c-.16-.62-.16-1.28 0-1.9l.7-4.15zm-1.2-5.46L8.1 10.5l4.5 2.6 4.5-2.6-4.15-2.4-4.15 2.4-4.84-2.8v5.55l.7 4.1zm5.1-4.15l-4.15 2.4-4.15-2.4 4.5-2.6 4.5 2.6v5.2l-4.84-2.8-1.4 4.05zm5.5-1.2l-4.15 4.15v-5.2l4.5-2.6 4.5 2.6v5.2l-4.15-2.4v-2.87zm4.32 2.12l-4.15 2.4V13l4.5 2.6 4.5-2.6v-5.2l-4.15-2.4c.16.62.16 1.28 0 1.9l-.7 4.15zm1.2 5.46l-4.15 2.4-4.5-2.6-4.5 2.6 4.15 2.4 4.15-2.4 4.84 2.8v-5.55l-.7-4.1z"/></svg>
								</div>
							{:else if model.provider === 'Google'}
								<div class="size-[60px] rounded-[16px] bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center p-2.5">
									<svg viewBox="0 0 24 24" fill="white" class="w-full h-full"><path d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5L12 2Z"/></svg>
								</div>
							{:else if model.provider === 'Meta'}
								<div class="size-[60px] rounded-[16px] bg-blue-600 flex items-center justify-center p-2">
									<svg viewBox="0 0 24 24" fill="white" class="w-full h-full"><path d="M12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0 2c2.67 0 8 1.34 8 4v2H4v-2c0-2.66 5.33-4 8-4z"/></svg>
								</div>
							{:else}
								<div class="size-[60px] rounded-[16px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center p-2">
									<span class="text-xl font-bold text-gray-400">{model.provider.charAt(0)}</span>
								</div>
							{/if}
						</div>

						<!-- Content -->
						<div class="flex flex-col gap-1 w-full pt-1">
							<!-- Title Row -->
							<div class="flex items-center gap-2">
								<span class="text-[17px] font-semibold text-gray-900 dark:text-white tracking-wide group-hover:underline decoration-white/30 underline-offset-4">
									{model.name}
								</span>
								<span class="text-[14px] text-gray-500">{model.provider.toLowerCase()}</span>
								
								<button 
									class="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-300 transition-all"
									on:click={() => copySlug(model.id)}
									title="Copy API ID"
								>
									{model.id}
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
								</button>
							</div>

							<!-- Metrics Row -->
							<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
								<div class="flex items-center gap-1 text-yellow-500 font-medium">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-3.5"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
									{model.rating}
								</div>
								<span>{model.reviews} reviews</span>
								<span class="hidden sm:inline w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
								<span>{model.context_length >= 1000000 ? (model.context_length / 1000000).toFixed(0) + 'M' : (model.context_length / 1000).toFixed(0) + 'K'} context</span>
								<span class="hidden sm:inline w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
								<span>${model.pricing.prompt.toFixed(2)}/M input</span>
								<span class="hidden sm:inline w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
								<span>${model.pricing.completion.toFixed(2)}/M output</span>
							</div>

							<!-- Description -->
							<div class="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mt-1.5 pr-8">
								{model.description}
							</div>
						</div>
					</a>
				{/each}
				
				{#if filteredModels.length === 0}
					<div class="flex flex-col items-center justify-center py-20 text-gray-500">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-8 mb-3 opacity-50"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
						No models found matching your criteria.
					</div>
				{/if}
			</div>
		{/if}

	</div>
</div>
