<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	const i18n = getContext('i18n');

	import { mobile, showArchivedChats, showSidebar, user } from '$lib/stores';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import { getUsage } from '$lib/apis/usage';

	// ── State ────────────────────────────────────────────────────────────────────
	let loaded = false;
	let loading = false;
	let activeTab = 'API capabilities';
	const tabs = ['API capabilities', 'Spend categories', 'Safety usage'];

	let summary = {
		totalSpend: 0,
		julySpend: 0,
		totalTokens: 0,
		totalRequests: 0
	};

	type Capability = {
		id: string;
		name: string;
		requests: number;
		detail: string;
		trend: number; // % change
	};

	let capabilities: Capability[] = [];

	// Simple bar chart widths
	$: maxRequests = capabilities.length > 0 ? Math.max(...capabilities.map((c) => c.requests)) : 0;

	onMount(async () => {
		loading = true;
		const res = await getUsage(localStorage.token).catch((e) => {
			toast.error(e || $i18n.t('Failed to load usage'));
			return null;
		});
		if (res) {
			summary = res.summary ?? summary;
			capabilities = res.capabilities ?? [];
		}
		loading = false;
		loaded = true;
	});
</script>

<!-- ─── Page Shell ──────────────────────────────────────────────────────────── -->
{#if loaded}
	<div
		class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
			? 'md:max-w-[calc(100%-var(--sidebar-width))]'
			: ''} max-w-full"
	>
		<!-- Navbar -->
		<nav class="px-2 pt-1.5 backdrop-blur-xl w-full drag-region">
			<div class="flex items-center">
				{#if $mobile}
					<div class="{$showSidebar ? 'md:hidden' : ''} flex flex-none items-center">
						<Tooltip
							content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
							interactive={true}
						>
							<button
								id="sidebar-toggle-button"
								class="cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
								on:click={() => showSidebar.set(!$showSidebar)}
							>
								<div class="self-center p-1.5">
									<SidebarIcon />
								</div>
							</button>
						</Tooltip>
					</div>
				{/if}

				<div class="ml-2 py-0.5 self-center flex items-center justify-between w-full">
					<div class="flex gap-1 scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium bg-transparent py-1 touch-auto pointer-events-auto">
						<span class="min-w-fit text-gray-900 dark:text-gray-100 font-semibold">
							{$i18n.t('Usage')}
						</span>
					</div>

					<div class="self-center flex items-center gap-1">
						{#if $user !== undefined && $user !== null}
							<UserMenu
								className="w-[240px]"
								role={$user?.role}
								help={true}
								on:show={(e) => {
									if (e.detail === 'archived-chat') showArchivedChats.set(true);
								}}
							>
								<button
									class="select-none flex rounded-xl p-1.5 w-full hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									aria-label={$i18n.t('User Menu')}
								>
									<div class="self-center">
										<img
											src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
											class="size-6 object-cover rounded-full"
											alt={$i18n.t('User profile')}
											draggable="false"
										/>
									</div>
								</button>
							</UserMenu>
						{/if}
					</div>
				</div>
			</div>
		</nav>

		<!-- Page body -->
		<div class="flex-1 overflow-y-auto @container">
			<div class="max-w-6xl mx-auto px-6 py-8">

				<!-- Page header -->
				<div class="flex flex-col @md:flex-row @md:items-start justify-between gap-4 mb-8">
					<div>
						<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
							{$i18n.t('Usage')}
						</h1>
						<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
							{$i18n.t('Monitor API consumption, token spend, and request volume.')}
						</p>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<button
							class="flex items-center gap-1.5 text-sm px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition text-gray-600 dark:text-gray-300"
							on:click={() => toast.info($i18n.t('Date range picker coming soon.'))}
						>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
							</svg>
							Jun 20 – Jul 5, 2026
						</button>
						<Tooltip content={$i18n.t('Refresh data')} placement="top">
							<button
								class="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition text-gray-500"
								on:click={() => toast.success($i18n.t('Usage data refreshed.'))}
								aria-label={$i18n.t('Refresh')}
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
									<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
								</svg>
							</button>
						</Tooltip>
					</div>
				</div>

				<!-- Summary stat cards -->
				<div class="grid grid-cols-2 @xl:grid-cols-4 gap-4 mb-8">
					{#each [
						{ label: $i18n.t('Total Spend'), value: `$${summary.totalSpend.toFixed(2)}`, sub: $i18n.t('this period') },
						{ label: $i18n.t('July Spend'), value: `$${summary.julySpend.toFixed(2)}`, sub: $i18n.t('month to date') },
						{ label: $i18n.t('Total Tokens'), value: summary.totalTokens.toLocaleString(), sub: $i18n.t('input + output') },
						{ label: $i18n.t('Total Requests'), value: summary.totalRequests.toLocaleString(), sub: $i18n.t('all endpoints') }
					] as stat}
						<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl p-5">
							<p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
								{stat.label}
							</p>
							<p class="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{stat.value}
							</p>
							<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{stat.sub}</p>
						</div>
					{/each}
				</div>

				<!-- Tabs -->
				<div class="flex border-b border-gray-200 dark:border-gray-850 mb-6 overflow-x-auto scrollbar-none">
					{#each tabs as tab}
						<button
							class="relative px-4 py-2.5 text-sm font-medium shrink-0 transition-colors {activeTab === tab
								? 'text-gray-900 dark:text-gray-100'
								: 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
							on:click={() => (activeTab = tab)}
						>
							{$i18n.t(tab)}
							{#if activeTab === tab}
								<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-gray-100 rounded-t-full" />
							{/if}
						</button>
					{/each}
				</div>

				<!-- Capabilities breakdown -->
				{#if activeTab === 'API capabilities'}
					<div class="flex flex-col gap-3">
						{#each capabilities as cap (cap.id)}
							<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-750 transition-colors">
								<div class="flex items-start justify-between gap-4 mb-4">
									<div>
										<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{cap.name}</p>
										<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{cap.detail}</p>
									</div>
									<div class="text-right shrink-0">
										<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{cap.requests}</p>
										<p class="text-xs {cap.trend > 0 ? 'text-green-600 dark:text-green-400' : cap.trend < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'} font-medium">
											{cap.trend > 0 ? '+' : ''}{cap.trend}% vs last period
										</p>
									</div>
								</div>
								<!-- Progress bar -->
								<div class="w-full bg-gray-100 dark:bg-gray-850 rounded-full h-1.5 overflow-hidden">
									<div
										class="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-500"
										style="width: {(cap.requests / maxRequests) * 100}%"
									/>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-10 opacity-40">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
						</svg>
						<p class="text-sm font-medium">{$i18n.t('No data available')}</p>
						<p class="text-xs">{$i18n.t('This breakdown will populate as you make API requests.')}</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
