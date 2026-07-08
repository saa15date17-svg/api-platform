<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/stores';
	import { WEBUI_API_BASE_URL } from '$lib/constants';
	import { getApiKeys } from '$lib/apis/api-keys';
	import { getUsage } from '$lib/apis/usage';

	const i18n = getContext('i18n');

	// ── State ────────────────────────────────────────────────────────────────
	let loaded = false;
	let showGetStarted = true;

	// Checklist state
	let hasApiKey = false;
	let hasTestedModel = false;

	// Stats
	let stats = {
		totalTokens: 0,
		totalRequests: 0,
		totalCost: 0
	};

	// Models from Bifrost via backend
	let models: Array<{ id: string; name?: string; description?: string; owned_by?: string }> = [];

	// ── On Mount: Load all live data ─────────────────────────────────────────
	onMount(async () => {
		// Restore dismiss state
		showGetStarted = localStorage.getItem('home_dismiss_getstarted') !== 'true';

		const token = localStorage.token;
		if (!token) {
			loaded = true;
			return;
		}

		// Load all data in parallel
		await Promise.allSettled([
			// 1. Usage stats (total tokens, requests)
			getUsage(token)
				.then((res) => {
					if (res?.summary) {
						stats.totalTokens = res.summary.totalTokens ?? 0;
						stats.totalRequests = res.summary.totalRequests ?? 0;
						stats.totalCost = res.summary.totalSpend ?? 0;
					}
				})
				.catch(() => {}),

			// 2. API keys — check if user has created any
			getApiKeys(token)
				.then((keys) => {
					hasApiKey = Array.isArray(keys) && keys.length > 0;
				})
				.catch(() => {}),

			// 3. Chats — check if user has tested a model
			fetch(`${WEBUI_API_BASE_URL}/chats/?page=1`, {
				headers: { authorization: `Bearer ${token}` }
			})
				.then((r) => r.json())
				.then((data) => {
					const list = Array.isArray(data) ? data : data?.chats ?? [];
					hasTestedModel = list.length > 0;
				})
				.catch(() => {}),

			// 4. Models from Bifrost (via backend proxy at /v1/models)
			fetch(`/v1/models`, {
				headers: { authorization: `Bearer ${token}` }
			})
				.then((r) => r.json())
				.then((data) => {
					models = (data?.data ?? []).slice(0, 3);
				})
				.catch(() => {})
		]);

		loaded = true;
	});

	function dismissGetStarted() {
		showGetStarted = false;
		localStorage.setItem('home_dismiss_getstarted', 'true');
	}
</script>

<div class="w-full max-w-7xl mx-auto flex flex-col gap-10 text-gray-900 dark:text-gray-100 pb-20">
	<h1 class="text-[28px] font-semibold mt-4">Home</h1>

	<!-- ── Get Started ──────────────────────────────────────────────────────── -->
	{#if showGetStarted}
		<div class="flex flex-col gap-3">
			<div class="flex justify-between items-center">
				<h2 class="text-lg font-medium">Get started</h2>
				<button
					class="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 transition"
					on:click={dismissGetStarted}
				>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
					Dismiss
				</button>
			</div>
			<div class="flex flex-col lg:flex-row gap-8 w-full items-stretch h-full">
				<!-- Checklist -->
				<div class="flex flex-col gap-6 w-full lg:w-1/3 py-2">
					<!-- Step 1: API Key -->
					<button
						class="flex items-center gap-3 group text-left"
						on:click={() => goto('/api-keys')}
					>
						<div class="size-6 rounded-full flex items-center justify-center shrink-0 transition
							{hasApiKey
								? 'bg-emerald-500 text-white'
								: 'border-2 border-gray-300 dark:border-gray-600 text-gray-400'}">
							{#if hasApiKey}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" /></svg>
							{/if}
						</div>
						<div class="text-[15px] font-medium group-hover:underline {hasApiKey ? '' : 'text-gray-500 dark:text-gray-400'}">
							1. Create an API key
						</div>
					</button>

					<!-- Step 2: Test model -->
					<button
						class="flex items-center gap-3 group text-left"
						on:click={() => goto('/models')}
					>
						<div class="size-6 rounded-full flex items-center justify-center shrink-0 transition
							{hasTestedModel
								? 'bg-emerald-500 text-white'
								: 'border-2 border-gray-300 dark:border-gray-600 text-gray-400'}">
							{#if hasTestedModel}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
							{/if}
						</div>
						<div class="text-[15px] font-medium group-hover:underline {hasTestedModel ? '' : 'text-gray-500 dark:text-gray-400'}">
							2. Test models
						</div>
					</button>

					<!-- Step 3: Add credits -->
					<button
						class="flex items-center gap-3 group text-left"
						on:click={() => toast.info('Billing coming soon — contact your administrator to add credits.')}
					>
						<div class="size-6 rounded-full border-2 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						</div>
						<div class="text-[15px] text-gray-500 dark:text-gray-400 group-hover:underline">3. Add credits</div>
					</button>
				</div>

				<!-- Gradient Banner with working buttons -->
				<div class="relative w-full lg:w-2/3 h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-end p-4 gap-4">
					<div class="absolute inset-0 opacity-40 mix-blend-overlay">
						<div class="font-mono text-xs text-white p-4 leading-relaxed whitespace-pre-wrap select-none">
def chat_completion(messages, model="gpt-4o"):
    response = client.chat.completions.create(
        model=model,
        messages=messages
    )
    return response.choices[0].message.content
						</div>
					</div>
					<!-- Developer Quickstart -->
					<button
						class="relative z-10 w-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-black/70 transition text-left"
						on:click={() => goto('/api-keys')}
					>
						<div class="flex justify-between items-center text-white mb-1">
							<span class="text-sm font-medium">Developer quickstart</span>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
						</div>
						<div class="text-xs text-gray-300">Make your first API request in minutes</div>
					</button>
					<!-- Start building -->
					<button
						class="relative z-10 w-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-black/70 transition text-left"
						on:click={() => goto('/models')}
					>
						<div class="flex justify-between items-center text-white mb-1">
							<span class="text-sm font-medium">Start building with models</span>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
						</div>
						<div class="text-xs text-gray-300">Access models configured in the gateway</div>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Stats Grid ────────────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
		<!-- Total tokens -->
		<button
			class="p-6 border-b border-r border-gray-200 dark:border-gray-800 flex flex-col gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition text-left"
			on:click={() => goto('/usage')}
		>
			<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
				Total tokens
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
			</div>
			<div class="text-2xl font-semibold">
				{#if loaded}
					{stats.totalTokens.toLocaleString()}
				{:else}
					<div class="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
				{/if}
			</div>
			<div class="mt-4 h-0.5 w-full bg-gray-100 dark:bg-gray-800 relative">
				<div class="absolute left-0 top-0 h-full bg-pink-500 transition-all duration-700"
					style="width: {stats.totalTokens > 0 ? Math.min(100, (stats.totalTokens / 1000000) * 100) : 2}%"></div>
				<div class="absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full border border-pink-500 bg-white transition-all duration-700"
					style="left: {stats.totalTokens > 0 ? Math.min(100, (stats.totalTokens / 1000000) * 100) : 2}%"></div>
			</div>
		</button>

		<!-- Responses & Chat Completions -->
		<button
			class="p-6 border-b border-r border-gray-200 dark:border-gray-800 flex flex-col gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition text-left"
			on:click={() => goto('/usage')}
		>
			<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
				Responses and Chat Completions
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
			</div>
			<div class="text-2xl font-semibold">
				{#if loaded}
					{stats.totalRequests.toLocaleString()}
				{:else}
					<div class="h-8 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
				{/if}
			</div>
			<div class="mt-4 flex w-full">
				<div class="w-full border-b border-dashed border-gray-300 dark:border-gray-600"></div>
			</div>
		</button>

		<!-- Safety insights promo banner -->
		<div class="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-[#FFE1E1] via-[#F4D9FF] to-[#D5E1FF] dark:from-pink-950/30 dark:via-purple-900/30 dark:to-blue-900/30 flex flex-col gap-2">
			<div class="flex justify-between items-start text-gray-900 dark:text-purple-100">
				<div class="font-medium text-[15px]">Introducing safety insights</div>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
			</div>
			<div class="text-[13px] text-gray-700 dark:text-purple-200/80 leading-relaxed mb-2">A new home for requests blocked for a variety of safety reasons</div>
			<div class="flex gap-2 mt-auto">
				<button
					class="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3.5 py-1.5 rounded-full text-xs font-medium"
					on:click={() => goto('/logs')}
				>Learn more</button>
				<button
					class="bg-transparent text-gray-700 dark:text-gray-300 px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-gray-900/5 dark:hover:bg-gray-100/10 transition"
					on:click={() => {}}
				>Dismiss</button>
			</div>
		</div>

		<!-- Credit remaining -->
		<div class="p-6 border-r border-gray-200 dark:border-gray-800 bg-[#7B5E05] dark:bg-[#5C4500] text-white flex flex-col gap-2">
			<div class="text-xs text-white/80">Credit remaining</div>
			<div class="text-2xl font-semibold flex items-center gap-2">
				${loaded ? stats.totalCost.toFixed(2) : '—'}
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5 text-white/80"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
			</div>
			<button
				class="mt-4 bg-white/20 hover:bg-white/30 text-white w-fit px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2"
				on:click={() => toast.info('Please contact your administrator to add credits.')}
			>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
				Add credits
			</button>
		</div>

		<!-- Total requests -->
		<button
			class="p-6 md:col-span-2 flex flex-col gap-2 relative group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition text-left"
			on:click={() => goto('/usage')}
		>
			<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
				Total requests
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
			</div>
			<div class="text-2xl font-semibold">
				{#if loaded}
					{stats.totalRequests.toLocaleString()}
				{:else}
					<div class="h-8 w-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
				{/if}
			</div>
			<div class="mt-4 h-0.5 w-full bg-gray-100 dark:bg-gray-800 relative">
				<div class="absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-700"
					style="width: {stats.totalRequests > 0 ? Math.min(100, (stats.totalRequests / 10000) * 100) : 2}%"></div>
				<div class="absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full border border-emerald-500 bg-white transition-all duration-700"
					style="left: {stats.totalRequests > 0 ? Math.min(100, (stats.totalRequests / 10000) * 100) : 2}%"></div>
			</div>
		</button>
	</div>

	<!-- ── Bottom Section ────────────────────────────────────────────────────── -->
	<div class="flex flex-col lg:flex-row gap-8 w-full">

		<!-- Recommended Models (LIVE from Bifrost via backend) -->
		<div class="flex-1 flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium">
					{loaded && models.length > 0 ? 'Available models' : 'Recommended models'}
				</h2>
				<button
					class="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition flex items-center gap-1"
					on:click={() => goto('/models')}
				>
					View all
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
				</button>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#if !loaded}
					<!-- Skeletons while loading -->
					{#each [1, 2, 3] as _}
						<div class="border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-2 bg-white dark:bg-transparent animate-pulse">
							<div class="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 mb-2" />
							<div class="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
							<div class="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded mt-1" />
						</div>
					{/each}
				{:else if models.length > 0}
					{#each models as model (model.id)}
						<button
							class="border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition cursor-pointer flex flex-col gap-2 bg-white dark:bg-transparent text-left"
							on:click={() => goto('/models')}
						>
							<div class="size-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-2 font-bold text-sm">
								{(model.id || model.name || 'M').charAt(0).toUpperCase()}
							</div>
							<div class="text-[15px] font-medium text-gray-900 dark:text-white truncate">{model.name ?? model.id}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
								{model.owned_by ? `by ${model.owned_by}` : 'Available via AI gateway'}
							</div>
						</button>
					{/each}
				{:else}
					<!-- Fallback static cards when Bifrost not connected -->
					{#each [
						{ name: 'GPT-4o', desc: 'A new class of intelligence for professional work. Native multimodal.', letter: 'G' },
						{ name: 'Claude 3.5 Sonnet', desc: 'Intelligence at scale for agents & complex reasoning.', letter: 'C' },
						{ name: 'Gemini 1.5 Pro', desc: 'Fast, cost-efficient model with 2M token context window.', letter: 'G' }
					] as card}
						<button
							class="border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition cursor-pointer flex flex-col gap-2 bg-white dark:bg-transparent text-left"
							on:click={() => goto('/models')}
						>
							<div class="size-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-700 dark:text-gray-300 mb-2 font-bold text-sm">
								{card.letter}
							</div>
							<div class="text-[15px] font-medium text-gray-900 dark:text-white">{card.name}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{card.desc}</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Updates panel -->
		<div class="w-full lg:w-80 flex flex-col gap-4 shrink-0">
			<h2 class="text-lg font-medium">Quick links</h2>
			<div class="flex flex-col gap-4">
				{#each [
					{ label: 'API Keys', desc: 'Create and manage your API keys', route: '/api-keys', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z' },
					{ label: 'Usage', desc: 'Monitor token spend and requests', route: '/usage', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
					{ label: 'Logs', desc: 'View request and activity logs', route: '/logs', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z' },
					{ label: 'Models', desc: 'Browse available AI models', route: '/models', icon: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9' }
				] as link}
					<button
						class="flex gap-4 group text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl p-2 -mx-2 transition"
						on:click={() => goto(link.route)}
					>
						<div class="size-9 shrink-0 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-blue-400 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4.5">
								<path stroke-linecap="round" stroke-linejoin="round" d={link.icon} />
							</svg>
						</div>
						<div class="flex flex-col gap-0.5 pt-0.5">
							<div class="text-sm font-medium group-hover:underline">{link.label}</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">{link.desc}</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
