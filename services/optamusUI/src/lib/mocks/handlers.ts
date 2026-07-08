import { http, HttpResponse, delay } from 'msw';
import {
	MOCK_USER,
	MOCK_MODELS,
	MOCK_CHAT_LIST,
	MOCK_FILES,
	MOCK_PROMPTS,
	MOCK_TOOLS,
	MOCK_KNOWLEDGE,
	MOCK_GROUPS,
	MOCK_FUNCTIONS,
	MOCK_SKILLS,
	MOCK_MEMORIES,
	MOCK_NOTES,
	MOCK_CHANNELS,
	MOCK_AUTOMATIONS,
	MOCK_CALENDARS,
	MOCK_FOLDERS,
	MOCK_UI_CONFIG,
	MOCK_CONFIG,
	MOCK_CHANGELOG,
	MOCK_API_KEYS,
	MOCK_LOGS,
	MOCK_USAGE,
	MOCK_DIRECTORY_MODELS
} from './mock-data';

const BASE = '/api';

export const handlers = [
	// ── Config ──────────────────────────────────────
	http.get(`${BASE}/config`, async () => {
		return HttpResponse.json(MOCK_CONFIG);
	}),

	http.get(`${BASE}/v1/configs/banners`, async () => {
		return HttpResponse.json([]);
	}),

	http.get(`${BASE}/changelog`, async () => {
		return HttpResponse.json(MOCK_CHANGELOG);
	}),

	http.get(`${BASE}/models`, async () => {
		return HttpResponse.json(MOCK_MODELS);
	}),



	http.post(`${BASE}/chat/completions`, async ({ request }) => {
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				const responseText = "This is a mock response from the platform API. The selected model has successfully processed your request.";
				const words = responseText.split(' ');
				
				for (const word of words) {
					const chunk = {
						choices: [{ delta: { content: word + ' ' } }]
					};
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
					await new Promise(resolve => setTimeout(resolve, 50));
				}
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			}
		});

		return new HttpResponse(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			},
		});
	}),

	// ── Auths ───────────────────────────────────────
	http.get(`${BASE}/v1/auths/`, async () => {
		return HttpResponse.json(MOCK_USER);
	}),

	http.post(`${BASE}/v1/auths/signin`, async ({ request }) => {
		const body = (await request.json()) as { email: string; password: string };
		if (body.email === 'admin@optamus.cloud' && body.password === 'admin123') {
			return HttpResponse.json({
				token: 'mock-jwt-token-admin',
				id: MOCK_USER.id,
				name: MOCK_USER.name,
				email: MOCK_USER.email,
				role: MOCK_USER.role,
				profile_image_url: MOCK_USER.profile_image_url
			});
		}
		return HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 });
	}),

	http.post(`${BASE}/v1/auths/signup`, async ({ request }) => {
		const body = (await request.json()) as any;
		return HttpResponse.json({
			token: 'mock-jwt-token-new',
			id: 'user-new-001',
			name: body.name,
			email: body.email,
			role: 'pending',
			profile_image_url: body.profile_image_url ?? ''
		});
	}),

	http.post(`${BASE}/v1/auths/signout`, async () => {
		return HttpResponse.json({ success: true });
	}),

	http.get(`${BASE}/v1/auths/admin/details`, async () => {
		return HttpResponse.json({
			name: 'Admin',
			role: 'admin',
			id: MOCK_USER.id,
			email: MOCK_USER.email
		});
	}),

	http.get(`${BASE}/v1/auths/admin/config`, async () => {
		return HttpResponse.json({
			ENABLE_SIGNUP: true,
			DEFAULT_USER_ROLE: 'pending',
			WEBUI_AUTH: true
		});
	}),

	// ── Models ──────────────────────────────────────
	http.get(`${BASE}/v1/models`, async () => {
		return HttpResponse.json(MOCK_MODELS);
	}),

	http.get(`${BASE}/v1/models/list`, async () => {
		return HttpResponse.json({
			data: MOCK_MODELS.map((m) => ({
				id: m.id,
				name: m.name,
				meta: m.meta,
				tags: [],
				is_active: m.is_active
			})),
			total: MOCK_MODELS.length
		});
	}),

	http.get(`${BASE}/v1/models/tags`, async () => {
		return HttpResponse.json([
			{ name: 'featured', count: 2 },
			{ name: 'free', count: 1 }
		]);
	}),

	http.get(`${BASE}/v1/models/base`, async () => {
		return HttpResponse.json(MOCK_MODELS);
	}),

	// ── Chats ───────────────────────────────────────
	http.get(`${BASE}/v1/chats/`, async () => {
		return HttpResponse.json(MOCK_CHAT_LIST);
	}),

	http.post(`${BASE}/v1/chats/new`, async ({ request }) => {
		const body = (await request.json()) as { chat: any; folder_id: string | null };
		const newChat = {
			id: `chat-${Date.now()}`,
			title: 'New Chat',
			chat: body.chat ?? { id: `chat-${Date.now()}`, title: 'New Chat', messages: [] },
			user_id: MOCK_USER.id,
			folder_id: body.folder_id ?? null,
			share_id: null,
			pinned: false,
			archived: false,
			meta: {},
			created_at: Date.now(),
			updated_at: Date.now()
		};
		return HttpResponse.json(newChat);
	}),

	http.get(`${BASE}/v1/chats/:id`, async ({ params }) => {
		const chat = MOCK_CHAT_LIST.find((c) => c.id === params.id);
		if (chat) {
			return HttpResponse.json(chat);
		}
		return HttpResponse.json({ detail: 'Chat not found' }, { status: 404 });
	}),

	http.post(`${BASE}/v1/chats/:id`, async ({ params, request }) => {
		const body = (await request.json()) as { chat: any };
		const existing = MOCK_CHAT_LIST.find((c) => c.id === params.id);
		if (existing) {
			return HttpResponse.json({ ...existing, chat: body.chat, updated_at: Date.now() });
		}
		return HttpResponse.json({ detail: 'Chat not found' }, { status: 404 });
	}),

	http.post(`${BASE}/v1/chats/:id/pin`, async ({ params }) => {
		const chat = MOCK_CHAT_LIST.find((c) => c.id === params.id);
		if (chat) {
			return HttpResponse.json({ pinned: !chat.pinned });
		}
		return HttpResponse.json({ pinned: true });
	}),

	http.delete(`${BASE}/v1/chats/:id`, async () => {
		return HttpResponse.json({ status: true });
	}),

	http.get(`${BASE}/v1/chats/pinned`, async () => {
		return HttpResponse.json(MOCK_CHAT_LIST.filter((c) => c.pinned));
	}),

	http.get(`${BASE}/v1/chats/archived`, async () => {
		return HttpResponse.json([]);
	}),

	http.get(`${BASE}/v1/chats/shared`, async () => {
		return HttpResponse.json([]);
	}),

	http.get(`${BASE}/v1/chats/search`, async ({ request }) => {
		const url = new URL(request.url);
		const text = url.searchParams.get('text') ?? '';
		const filtered = MOCK_CHAT_LIST.filter(
			(c) => c.title.toLowerCase().includes(text.toLowerCase())
		);
		return HttpResponse.json(filtered);
	}),

	// ── Users ───────────────────────────────────────
	http.get(`${BASE}/v1/users/`, async () => {
		return HttpResponse.json([MOCK_USER]);
	}),

	http.get(`${BASE}/v1/users/all`, async () => {
		return HttpResponse.json([MOCK_USER]);
	}),

	http.get(`${BASE}/v1/users/user/settings`, async () => {
		return HttpResponse.json({
			state: { pinnedModels: [], pinnedFolders: [] },
			name: 'Admin',
			profile_image_url: '',
			password: '',
			showUsername: false
		});
	}),

	http.get(`${BASE}/v1/users/user/info`, async () => {
		return HttpResponse.json({
			name: MOCK_USER.name,
			locale: 'en-US',
			info: {}
		});
	}),

	// ── Files ───────────────────────────────────────
	http.get(`${BASE}/v1/files/`, async () => {
		return HttpResponse.json(MOCK_FILES);
	}),

	http.get(`${BASE}/v1/files/count`, async () => {
		return HttpResponse.json({ count: MOCK_FILES.length });
	}),

	// ── Prompts ─────────────────────────────────────
	http.get(`${BASE}/v1/prompts/`, async () => {
		return HttpResponse.json(MOCK_PROMPTS);
	}),

	http.get(`${BASE}/v1/prompts/list`, async () => {
		return HttpResponse.json(MOCK_PROMPTS);
	}),

	http.get(`${BASE}/v1/prompts/tags`, async () => {
		return HttpResponse.json([{ name: 'utility', count: 2 }]);
	}),

	// ── Tools ───────────────────────────────────────
	http.get(`${BASE}/v1/tools/`, async () => {
		return HttpResponse.json(MOCK_TOOLS);
	}),

	http.get(`${BASE}/v1/tools/list`, async () => {
		return HttpResponse.json(MOCK_TOOLS);
	}),

	// ── Knowledge ───────────────────────────────────
	http.get(`${BASE}/v1/knowledge/`, async () => {
		return HttpResponse.json(MOCK_KNOWLEDGE);
	}),

	// ── Groups ──────────────────────────────────────
	http.get(`${BASE}/v1/groups/`, async () => {
		return HttpResponse.json(MOCK_GROUPS);
	}),

	// ── Functions ───────────────────────────────────
	http.get(`${BASE}/v1/functions/`, async () => {
		return HttpResponse.json(MOCK_FUNCTIONS);
	}),

	http.get(`${BASE}/v1/functions/list`, async () => {
		return HttpResponse.json(MOCK_FUNCTIONS);
	}),

	// ── Skills ──────────────────────────────────────
	http.get(`${BASE}/v1/skills/`, async () => {
		return HttpResponse.json(MOCK_SKILLS);
	}),

	http.get(`${BASE}/v1/skills/list`, async () => {
		return HttpResponse.json(MOCK_SKILLS);
	}),

	// ── Memories ────────────────────────────────────
	http.get(`${BASE}/v1/memories/`, async () => {
		return HttpResponse.json(MOCK_MEMORIES);
	}),

	// ── Notes ───────────────────────────────────────
	http.get(`${BASE}/v1/notes/`, async () => {
		return HttpResponse.json(MOCK_NOTES);
	}),

	http.get(`${BASE}/v1/notes/search`, async () => {
		return HttpResponse.json({
			items: MOCK_NOTES,
			total: MOCK_NOTES.length
		});
	}),

	// ── Channels ────────────────────────────────────
	http.get(`${BASE}/v1/channels/`, async () => {
		return HttpResponse.json(MOCK_CHANNELS);
	}),

	// ── Automations ─────────────────────────────────
	http.get(`${BASE}/v1/automations/list`, async () => {
		return HttpResponse.json({ items: MOCK_AUTOMATIONS, total: 0 });
	}),

	// ── Calendar ────────────────────────────────────
	http.get(`${BASE}/v1/calendars/`, async () => {
		return HttpResponse.json(MOCK_CALENDARS);
	}),

	http.get(`${BASE}/v1/calendars/events`, async () => {
		return HttpResponse.json([]);
	}),

	// ── Folders ─────────────────────────────────────
	http.get(`${BASE}/v1/folders/`, async () => {
		return HttpResponse.json(MOCK_FOLDERS);
	}),

	http.get(`${BASE}/v1/folders/shared`, async () => {
		return HttpResponse.json([]);
	}),

	// ── UI Config ───────────────────────────────────
	http.get(`${BASE}/v1/configs/ui`, async () => {
		return HttpResponse.json(MOCK_UI_CONFIG);
	}),

	// ── Chat Completions (Streaming SSE) ────────────
	http.post(`${BASE}/chat/completions`, async ({ request }) => {
		const body = (await request.json()) as { messages?: { role: string; content: string }[] };
		const userMsg = body.messages?.find((m) => m.role === 'user');
		const userContent = userMsg?.content ?? 'Hello';

		const responseText = `This is a mock response to: "${userContent.slice(0, 100)}".\n\nI'm running in **mock mode** with MSW (Mock Service Worker). The backend is not connected, but the UI is fully functional with simulated data.`;

		const stream = new ReadableStream({
			start(controller) {
				const words = responseText.split(' ');
				let index = 0;

				const emitWord = () => {
					if (index < words.length) {
						const word = words[index] === words[0] ? words[index] : ' ' + words[index];
						const chunk = {
							id: 'mock-chatcmpl-001',
							object: 'chat.completion.chunk',
							created: Math.floor(Date.now() / 1000),
							model: 'mock-model',
							choices: [
								{
									index: 0,
									delta: { content: word },
									finish_reason: null
								}
							]
						};
						controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
						index++;
						if (index <= words.length) {
							setTimeout(emitWord, 20 + Math.random() * 30);
						} else {
							const doneChunk = {
								id: 'mock-chatcmpl-001',
								object: 'chat.completion.chunk',
								created: Math.floor(Date.now() / 1000),
								model: 'mock-model',
								choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
							};
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(doneChunk)}\n\n`));
							controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
							controller.close();
						}
					}
				};

				emitWord();
			}
		});

		return new HttpResponse(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	}),

	// ── API Keys ──────────────────────────────────────
	http.get(`${BASE}/api-keys`, async () => {
		return HttpResponse.json(MOCK_API_KEYS);
	}),
	http.post(`${BASE}/api-keys`, async ({ request }) => {
		const body = await request.json() as { name: string };
		const rand = () => Math.random().toString(36).substring(2, 10);
		const rawKey = `sk-proj-${rand()}${rand()}`;
		const newKey = {
			id: `k-${Date.now()}`,
			name: body.name || 'New Key',
			status: 'active',
			trackingId: `key_${rand()}`,
			secretKeyMask: rawKey.substring(0, 12) + '...' + rawKey.slice(-4),
			createdAt: new Date().toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			}),
			lastUsedAt: null,
			createdBy: 'User',
			permissions: 'All',
			_raw: rawKey // only returned once
		};
		// Ideally we would mutate MOCK_API_KEYS here, but since it's mock we just return it
		return HttpResponse.json(newKey);
	}),
	http.delete(`${BASE}/api-keys/:id`, async () => {
		return HttpResponse.json({ success: true });
	}),

	// ── Logs ──────────────────────────────────────────
	http.get(`${BASE}/logs`, async () => {
		return HttpResponse.json(MOCK_LOGS);
	}),

	// ── Usage ─────────────────────────────────────────
	http.get(`${BASE}/usage`, async () => {
		return HttpResponse.json(MOCK_USAGE);
	})
];
