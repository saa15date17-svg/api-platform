<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$lib/utils/transitions';

	const i18n = getContext('i18n');

	import { mobile, showArchivedChats, showSidebar, user } from '$lib/stores';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import UserMenu from '$lib/components/layout/Sidebar/UserMenu.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import { getApiKeys, createApiKey, deleteApiKey as apiDeleteApiKey } from '$lib/apis/api-keys';

	// ── Types ────────────────────────────────────────────────────────────────────
	type ApiKey = {
		id: string;
		name: string;
		status: 'active' | 'revoked';
		trackingId: string;
		secretKeyMask: string;
		createdAt: string;
		lastUsedAt: string | null;
		createdBy: string;
		permissions: string;
	};

	// ── State ───────────────────────────────────────────────────────────────
	let loaded = false;
	let loading = false;

	let keys: ApiKey[] = [];

	// ── Derived / Reactive ───────────────────────────────────────────────────────
	let searchQuery = '';
	$: filteredKeys = keys.filter((k) =>
		[k.name, k.trackingId, k.createdBy]
			.join(' ')
			.toLowerCase()
			.includes(searchQuery.toLowerCase())
	);

	// ── Create Key Modal ─────────────────────────────────────────────────────────
	let showCreateModal = false;
	let newKeyName = '';
	let generatedKey = '';
	let creatingKey = false;

	function openCreateModal() {
		newKeyName = '';
		generatedKey = '';
		showCreateModal = true;
	}

	async function createKey() {
		if (!newKeyName.trim()) {
			toast.error($i18n.t('Please enter a key name.'));
			return;
		}
		creatingKey = true;
		const res = await createApiKey(localStorage.token, newKeyName.trim(), $user?.id).catch((e) => {
			toast.error(e || $i18n.t('Failed to create API key'));
			return null;
		});

		if (res) {
			keys = [...keys, res];
			generatedKey = res._raw || ''; // raw key only returned on creation
			toast.success($i18n.t('API key created successfully.'));
		}
		creatingKey = false;
	}

	// ── Delete Key ───────────────────────────────────────────────────────────────
	let keyToDelete: ApiKey | null = null;

	function confirmDelete(key: ApiKey) {
		keyToDelete = key;
	}

	async function deleteKey() {
		if (!keyToDelete) return;
		const id = keyToDelete.id;
		
		const res = await apiDeleteApiKey(localStorage.token, id).catch((e) => {
			toast.error(e || $i18n.t('Failed to delete API key'));
			return null;
		});

		if (res) {
			keys = keys.filter((k) => k.id !== id);
			toast.success($i18n.t('API key deleted.'));
		}
		keyToDelete = null;
	}

	// ── Lifecycle ────────────────────────────────────────────────────────────────
	onMount(async () => {
		loading = true;
		const res = await getApiKeys(localStorage.token).catch((e) => {
			toast.error(e || $i18n.t('Failed to load API keys'));
			return [];
		});
		if (res) {
			keys = res;
		}
		loading = false;
		loaded = true;
	});
</script>

<!-- ─── Delete Confirm Dialog ──────────────────────────────────────────────── -->
{#if keyToDelete}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black/60 w-full h-screen max-h-[100dvh] flex justify-center z-[9999] overflow-y-auto overscroll-contain p-3"
		in:fade={{ duration: 10 }}
		on:mousedown={() => (keyToDelete = null)}
	>
		<div
			class="m-auto max-w-full w-[30rem] mx-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm rounded-4xl shadow-3xl border border-white dark:border-gray-900"
			in:flyAndScale
			on:mousedown={(e) => e.stopPropagation()}
		>
			<div class="px-7 py-6 flex flex-col gap-4">
				<div class="text-lg font-semibold dark:text-gray-200">
					{$i18n.t('Delete API Key')}
				</div>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{$i18n.t('Are you sure you want to delete')}
					<span class="font-semibold text-gray-800 dark:text-gray-200">"{keyToDelete.name}"</span>?
					{$i18n.t('This action cannot be undone.')}
				</p>
				<div class="flex justify-between gap-2 mt-2">
					<button
						class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-850 dark:hover:bg-gray-800 dark:text-white font-medium w-full py-2.5 rounded-3xl transition"
						on:click={() => (keyToDelete = null)}
					>
						{$i18n.t('Cancel')}
					</button>
					<button
						class="text-sm bg-red-600 hover:bg-red-700 text-white font-medium w-full py-2.5 rounded-3xl transition"
						on:click={deleteKey}
					>
						{$i18n.t('Delete')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ─── Create Key Modal ────────────────────────────────────────────────────── -->
{#if showCreateModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 bg-black/60 w-full h-screen max-h-[100dvh] flex justify-center z-[9999] overflow-y-auto overscroll-contain p-3"
		in:fade={{ duration: 10 }}
		on:mousedown={() => {
			if (!creatingKey) {
				showCreateModal = false;
				generatedKey = '';
			}
		}}
	>
		<div
			class="m-auto max-w-full w-[30rem] mx-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm rounded-4xl shadow-3xl border border-white dark:border-gray-900"
			in:flyAndScale
			on:mousedown={(e) => e.stopPropagation()}
		>
			{#if !generatedKey}
				<!-- Step 1: Name input -->
				<div class="px-7 py-6 flex flex-col gap-5">
					<div>
						<div class="text-lg font-semibold dark:text-gray-200 mb-0.5">
							{$i18n.t('Create new secret key')}
						</div>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{$i18n.t('Give your key a descriptive name to identify it in usage reports.')}
						</p>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
							{$i18n.t('Key name')}
						</label>
						<input
							type="text"
							bind:value={newKeyName}
							placeholder={$i18n.t('e.g. My production key')}
							class="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition"
							autofocus
						/>
					</div>

					<div class="flex justify-between gap-2 pt-1">
						<button
							class="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-850 dark:hover:bg-gray-800 dark:text-white font-medium w-full py-2.5 rounded-3xl transition"
							on:click={() => (showCreateModal = false)}
							disabled={creatingKey}
						>
							{$i18n.t('Cancel')}
						</button>
						<button
							class="text-sm bg-gray-900 hover:bg-gray-850 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-800 font-medium w-full py-2.5 rounded-3xl transition flex items-center justify-center gap-2"
							on:click={createKey}
							disabled={creatingKey}
						>
							{#if creatingKey}
								<Spinner className="size-4" />
							{/if}
							{$i18n.t('Create key')}
						</button>
					</div>
				</div>
			{:else}
				<!-- Step 2: Show generated key -->
				<div class="px-7 py-6 flex flex-col gap-5">
					<div>
						<div class="text-lg font-semibold dark:text-gray-200 mb-0.5">
							{$i18n.t('Save your secret key')}
						</div>
						<p class="text-sm text-amber-600 dark:text-amber-400 font-medium">
							{$i18n.t(
								'Copy and store this key now. For security reasons, it will not be shown again.'
							)}
						</p>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
							{$i18n.t('Secret key')}
						</label>
						<div
							class="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl"
						>
							<span class="flex-1 font-mono text-xs text-gray-800 dark:text-gray-200 break-all">
								{generatedKey}
							</span>
							<button
								class="shrink-0 text-xs font-semibold px-3 py-1.5 bg-gray-900 hover:bg-gray-850 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl transition"
								on:click={() => {
									navigator.clipboard.writeText(generatedKey);
									toast.success($i18n.t('Copied to clipboard!'));
								}}
							>
								{$i18n.t('Copy')}
							</button>
						</div>
					</div>

					<button
						class="text-sm bg-gray-900 hover:bg-gray-850 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-800 font-medium w-full py-2.5 rounded-3xl transition"
						on:click={() => {
							showCreateModal = false;
							generatedKey = '';
						}}
					>
						{$i18n.t('Done')}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ─── Page Shell ──────────────────────────────────────────────────────────── -->
{#if loaded}
	<div
		class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
			? 'md:max-w-[calc(100%-var(--sidebar-width))]'
			: ''} max-w-full"
	>
		<!-- Navbar — matches notes/+page.svelte exactly -->
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
							{$i18n.t('API Keys')}
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
				<div class="flex flex-col @md:flex-row @md:items-center justify-between gap-4 mb-8">
					<div>
						<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
							{$i18n.t('API Keys')}
						</h1>
						<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
							{$i18n.t('Create and manage secret keys to authenticate your API requests.')}
						</p>
					</div>
					<button
						id="create-api-key-btn"
						class="text-sm bg-gray-900 hover:bg-gray-850 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-800 font-medium px-4 py-2 rounded-2xl transition shrink-0"
						on:click={openCreateModal}
					>
						+ {$i18n.t('Create new secret key')}
					</button>
				</div>

				<!-- Search bar -->
				<div class="mb-4 flex items-center gap-3">
					<div class="relative flex-1 max-w-sm">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none">
							<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder={$i18n.t('Search keys...')}
							class="w-full pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition"
						/>
					</div>
					<span class="text-xs text-gray-400 shrink-0">
						{filteredKeys.length}
						{filteredKeys.length === 1 ? $i18n.t('key') : $i18n.t('keys')}
					</span>
				</div>

				<!-- Keys table -->
				<div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl overflow-hidden">
					{#if keys.length === 0}
						<div class="py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-10 opacity-50">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 18.75 8.25Z" />
							</svg>
							<p class="text-sm font-medium">{$i18n.t('No API keys yet')}</p>
							<p class="text-xs">{$i18n.t('Create your first key to get started.')}</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full text-sm text-left border-collapse">
								<thead>
									<tr class="border-b border-gray-100 dark:border-gray-850 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										<th class="py-3.5 px-5">{$i18n.t('Name')}</th>
										<th class="py-3.5 px-5">{$i18n.t('Status')}</th>
										<th class="py-3.5 px-5 hidden @xl:table-cell">{$i18n.t('Tracking ID')}</th>
										<th class="py-3.5 px-5">{$i18n.t('Secret Key')}</th>
										<th class="py-3.5 px-5 hidden @lg:table-cell">{$i18n.t('Created')}</th>
										<th class="py-3.5 px-5 hidden @lg:table-cell">{$i18n.t('Last Used')}</th>
										<th class="py-3.5 px-5 text-right">{$i18n.t('Actions')}</th>
									</tr>
								</thead>
								<tbody>
									{#each filteredKeys as key (key.id)}
										<tr class="border-b border-gray-50 dark:border-gray-850/50 hover:bg-gray-50/60 dark:hover:bg-gray-850/30 transition-colors group">
											<td class="py-3.5 px-5 font-medium text-gray-900 dark:text-gray-100">{key.name}</td>
											<td class="py-3.5 px-5">
												<Badge type={key.status === 'active' ? 'success' : 'muted'} content={key.status} />
											</td>
											<td class="py-3.5 px-5 font-mono text-xs text-gray-400 dark:text-gray-500 hidden @xl:table-cell">
												{key.trackingId}
											</td>
											<td class="py-3.5 px-5 font-mono text-xs text-gray-500 dark:text-gray-400">
												{key.secretKeyMask}
											</td>
											<td class="py-3.5 px-5 text-gray-500 dark:text-gray-400 hidden @lg:table-cell">
												{key.createdAt}
											</td>
											<td class="py-3.5 px-5 text-gray-500 dark:text-gray-400 hidden @lg:table-cell">
												{key.lastUsedAt ?? $i18n.t('Never')}
											</td>
											<td class="py-3.5 px-5 text-right">
												<Tooltip content={$i18n.t('Delete key')} placement="left">
													<button
														class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100"
														on:click={() => confirmDelete(key)}
														aria-label={$i18n.t('Delete key')}
													>
														<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
															<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
														</svg>
													</button>
												</Tooltip>
											</td>
										</tr>
									{/each}

									{#if filteredKeys.length === 0 && searchQuery}
										<tr>
											<td colspan="7" class="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
												{$i18n.t('No keys match your search.')}
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					{/if}
				</div>

				<!-- Footer note -->
				<p class="mt-4 text-xs text-gray-400 dark:text-gray-500">
					{$i18n.t('Keep your secret keys safe — do not share them publicly or commit them to version control.')}
				</p>
			</div>
		</div>
	</div>
{/if}
