<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getDirectoryModelById } from '$lib/apis/models';
	import Spinner from '$lib/components/common/Spinner.svelte';

	let loading = true;
	let model: any = null;
	$: id = $page.params.id;

	let activeTab: 'overview' | 'api' | 'playground' = 'overview';
	let activeCodeTab: 'curl' | 'python' | 'node' = 'curl';

	onMount(async () => {
		loading = true;
		const res = await getDirectoryModelById(localStorage.token, id).catch((e) => {
			toast.error('Failed to load model details');
			return null;
		});
		if (res) {
			model = res;
		}
		loading = false;
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}

	function getCodeSnippet(type: string, modelId: string) {
        const baseUrl = $page.url.origin + '/api/v1';
		if (type === 'curl') {
			return `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  }'`;
		} else if (type === 'python') {
			return `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="your-api-key",
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[
        {"role": "user", "content": "What is the meaning of life?"}
    ]
)
print(response.choices[0].message.content)`;
		} else if (type === 'node') {
			return `import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: "${baseUrl}",
    apiKey: "your-api-key",
});

const response = await openai.chat.completions.create({
    model: "${modelId}",
    messages: [
        { role: "user", content: "What is the meaning of life?" }
    ],
});
console.log(response.choices[0].message.content);`;
		}
		return '';
	}
</script>

<div class="w-full h-full overflow-y-auto">
	{#if loading}
		<div class="flex justify-center items-center py-32">
			<Spinner />
		</div>
	{:else if !model}
		<div class="flex flex-col items-center justify-center py-32 text-gray-500">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Model Not Found</h1>
			<p class="mb-6">We couldn't find a model with the ID "{id}".</p>
			<a href="/models" class="text-blue-500 hover:underline flex items-center gap-1">
				&larr; Back to Directory
			</a>
		</div>
	{:else}
		<div class="max-w-[1200px] mx-auto px-6 py-12 flex flex-col gap-8">
			
			<!-- Back Link -->
			<a href="/models" class="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 flex items-center gap-1 w-fit transition-colors">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
				Back to Models
			</a>

			<!-- HERO SECTION -->
			<div class="flex flex-col md:flex-row gap-8 items-start md:items-center">
				<!-- Avatar -->
				<div class="shrink-0">
					<div class="size-24 rounded-2xl bg-gray-900 dark:bg-white flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-800">
						<span class="text-4xl font-semibold text-white dark:text-gray-900">{model.name.charAt(0)}</span>
					</div>
				</div>

				<!-- Title & Badges -->
				<div class="flex flex-col gap-3 flex-1">
					<div class="flex flex-wrap items-center gap-3">
						<h1 class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{model.name}</h1>
						<span class="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase">
							{model.provider}
						</span>
					</div>
					
					<!-- Capabilities Pills -->
					<div class="flex flex-wrap items-center gap-2 mt-1">
						{#if model.capabilities.vision}
							<span class="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
								Vision
							</span>
						{/if}
						{#if model.capabilities.function_calling}
							<span class="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.827M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
								Function Calling
							</span>
						{/if}
						{#if model.capabilities.json_mode}
							<span class="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>
								JSON Mode
							</span>
						{/if}
					</div>
				</div>

				<!-- Launch CTA -->
				<div class="flex-shrink-0 w-full md:w-auto">
					<a 
						href={`/?models=${model.id}`}
						class="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-semibold transition-all shadow-sm"
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" /></svg>
						Launch Playground
					</a>
				</div>
			</div>

			<!-- STATS BAR -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm mt-4">
				<div class="flex flex-col gap-1 bg-white dark:bg-[#1a1a1a] p-5">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Context Window</span>
					<span class="text-xl font-semibold text-gray-900 dark:text-white">
						{model.context_length >= 1000000 ? (model.context_length / 1000000).toFixed(0) + 'M' : (model.context_length / 1000).toFixed(0) + 'K'}
					</span>
				</div>
				<div class="flex flex-col gap-1 bg-white dark:bg-[#1a1a1a] p-5">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Input Price (1M)</span>
					<span class="text-xl font-semibold text-gray-900 dark:text-white">${model.pricing.prompt.toFixed(2)}</span>
				</div>
				<div class="flex flex-col gap-1 bg-white dark:bg-[#1a1a1a] p-5">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Output Price (1M)</span>
					<span class="text-xl font-semibold text-gray-900 dark:text-white">${model.pricing.completion.toFixed(2)}</span>
				</div>
				<div class="flex flex-col gap-1 bg-white dark:bg-[#1a1a1a] p-5">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Rating</span>
					<div class="flex items-center gap-1.5">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 text-yellow-500"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>
						<span class="text-xl font-semibold text-gray-900 dark:text-white">{model.rating}</span>
						<span class="text-sm text-gray-500 ml-1">({model.reviews})</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mt-6">
				<button 
					class="pb-4 px-1 text-[15px] font-medium border-b-2 transition-all {activeTab === 'overview' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
					on:click={() => activeTab = 'overview'}
				>
					Overview
				</button>
				<button 
					class="pb-4 px-1 text-[15px] font-medium border-b-2 transition-all {activeTab === 'api' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
					on:click={() => activeTab = 'api'}
				>
					API & Code
				</button>
			</div>

			<!-- TAB CONTENT -->
			<div class="pt-4 pb-20">
				{#if activeTab === 'overview'}
					<div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
						<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">About this model</h2>
						<p class="text-[16px] text-gray-600 dark:text-gray-300 leading-relaxed">
							{model.description}
						</p>
						
						<div class="mt-10 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
							<h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Why use {model.name}?</h3>
							<ul class="space-y-3">
								<li class="flex items-start gap-3">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5 text-emerald-500 mt-0.5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
									<span class="text-gray-600 dark:text-gray-300">Industry-leading performance on complex logic and coding tasks.</span>
								</li>
								<li class="flex items-start gap-3">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5 text-emerald-500 mt-0.5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
									<span class="text-gray-600 dark:text-gray-300">Extensive context window ({model.context_length >= 1000000 ? (model.context_length / 1000000).toFixed(0) + 'M' : (model.context_length / 1000).toFixed(0) + 'K'} tokens) for massive document analysis.</span>
								</li>
								<li class="flex items-start gap-3">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5 text-emerald-500 mt-0.5 shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
									<span class="text-gray-600 dark:text-gray-300">Highly cost-effective compared to previous generation flagship models.</span>
								</li>
							</ul>
						</div>
					</div>

				{:else if activeTab === 'api'}
					<div class="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div class="flex flex-col gap-6">
							<div class="flex flex-col gap-2">
								<h2 class="text-xl font-bold text-gray-900 dark:text-white">API Integration</h2>
								<p class="text-[15px] text-gray-500 dark:text-gray-400">
									Integrate {model.name} directly into your application using our OpenAI-compatible endpoint.
								</p>
							</div>

							<div class="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden shadow-xl">
								
								<!-- Tabs -->
								<div class="flex items-center px-2 pt-2 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50">
									<button 
										class="px-5 py-3 text-sm font-medium border-b-2 transition-colors {activeCodeTab === 'curl' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
										on:click={() => activeCodeTab = 'curl'}
									>
										cURL
									</button>
									<button 
										class="px-5 py-3 text-sm font-medium border-b-2 transition-colors {activeCodeTab === 'python' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
										on:click={() => activeCodeTab = 'python'}
									>
										Python
									</button>
									<button 
										class="px-5 py-3 text-sm font-medium border-b-2 transition-colors {activeCodeTab === 'node' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
										on:click={() => activeCodeTab = 'node'}
									>
										Node.js
									</button>
									
									<button 
										class="ml-auto flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 dark:text-gray-300 dark:hover:text-white dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors mr-2 mb-1 shadow-sm"
										on:click={() => copyToClipboard(getCodeSnippet(activeCodeTab, model.id))}
									>
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
										Copy
									</button>
								</div>
								
								<!-- Code Area -->
								<div class="p-6 overflow-x-auto">
									<pre><code class="text-[13px] font-mono text-gray-800 dark:text-gray-300 leading-relaxed">{getCodeSnippet(activeCodeTab, model.id)}</code></pre>
								</div>
							</div>
						</div>
					</div>

				{/if}
			</div>

		</div>
	{/if}
</div>
