export const MOCK_USER = {
	id: 'admin-001',
	name: 'Admin',
	email: 'admin@optamus.cloud',
	role: 'admin',
	profile_image_url: '',
	createdAt: Date.now(),
	lastActiveAt: Date.now(),
	settings: {
		method: 'webui',
		showUpdateDialog: true,
		savePredefinedStopSentence: false,
		modules: {}
	}
};

export const MOCK_MODELS = [
	{
		id: 'stepfun/step-3.7-flash:free',
		name: 'Step 3.7 Flash (Free)',
		base_model_id: 'stepfun/step-3.7-flash:free',
		meta: {
			profile_image_url: '',
			description: 'A fast and capable model by StepFun',
			suggestions: [
				'Write a Python script to scrape a website.',
				'Compare and contrast the benefits of cloud computing vs. on-premise solutions.',
				'What are the implications of the recent advancements in AI?',
				'Write a sales pitch for a new line of eco-friendly products.'
			]
		},
		params: {},
		access_grants: [],
		is_active: true,
		created_at: Date.now(),
		updated_at: Date.now()
	},
	{
		id: 'openai/gpt-4o',
		name: 'GPT-4o',
		base_model_id: 'openai/gpt-4o',
		meta: {
			profile_image_url: '',
			description: 'OpenAI GPT-4o model'
		},
		params: {},
		access_grants: [],
		is_active: true,
		created_at: Date.now(),
		updated_at: Date.now()
	},
	{
		id: 'anthropic/claude-3.5-sonnet',
		name: 'Claude 3.5 Sonnet',
		base_model_id: 'anthropic/claude-3.5-sonnet',
		meta: {
			profile_image_url: '',
			description: 'Anthropic Claude 3.5 Sonnet model'
		},
		params: {},
		access_grants: [],
		is_active: true,
		created_at: Date.now(),
		updated_at: Date.now()
	},
	{
		id: 'google/gemini-2.0-flash-001',
		name: 'Gemini 2.0 Flash',
		base_model_id: 'google/gemini-2.0-flash-001',
		meta: {
			profile_image_url: '',
			description: 'Google Gemini 2.0 Flash model'
		},
		params: {},
		access_grants: [],
		is_active: true,
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_CHAT_LIST = [
	{
		id: 'chat-001',
		title: 'Welcome Chat',
		chat: {
			id: 'chat-001',
			title: 'Welcome Chat',
			model: 'stepfun/step-3.7-flash:free',
			messages: [
				{
					id: 'msg-001',
					role: 'user',
					content: 'Hello! What can you help me with?',
					timestamp: Date.now()
				},
				{
					id: 'msg-002',
					role: 'assistant',
					content:
						'Hello! I can help you with a wide range of tasks including writing, analysis, coding, and more. How can I assist you today?',
					timestamp: Date.now()
				}
			],
			updatedAt: Date.now()
		},
		user_id: 'admin-001',
		folder_id: null,
		share_id: null,
		pinned: false,
		archived: false,
		meta: {},
		created_at: Date.now() - 86400000,
		updated_at: Date.now()
	},
	{
		id: 'chat-002',
		title: 'Code Review Session',
		chat: {
			id: 'chat-002',
			title: 'Code Review Session',
			model: 'openai/gpt-4o',
			messages: [],
			updatedAt: Date.now()
		},
		user_id: 'admin-001',
		folder_id: null,
		share_id: null,
		pinned: true,
		archived: false,
		meta: {},
		created_at: Date.now() - 172800000,
		updated_at: Date.now() - 3600000
	}
];

export const MOCK_FILES = [
	{
		id: 'file-001',
		meta: { name: 'sample-document.pdf', size: 1024000, content_type: 'application/pdf' },
		user_id: 'admin-001',
		created_at: Date.now(),
		updated_at: Date.now()
	},
	{
		id: 'file-002',
		meta: { name: 'notes.txt', size: 512, content_type: 'text/plain' },
		user_id: 'admin-001',
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_PROMPTS = [
	{
		id: 'prompt-001',
		command: 'summarize',
		name: 'Summarize Text',
		content: 'Please summarize the following text concisely:',
		user_id: 'admin-001',
		meta: { content: 'Please summarize the following text concisely:', description: 'Summarize any text' },
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	},
	{
		id: 'prompt-002',
		command: 'translate',
		name: 'Translate Text',
		content: 'Translate the following text to {{language}}:',
		user_id: 'admin-001',
		meta: { content: 'Translate the following text to {{language}}:', description: 'Translate text' },
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_TOOLS = [
	{
		id: 'tool-001',
		name: 'Web Search',
		type: 'built-in',
		description: 'Search the web for information',
		content: '',
		user_id: 'admin-001',
		meta: {},
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_KNOWLEDGE = [
	{
		id: 'kb-001',
		name: 'Company Docs',
		description: 'Internal company documentation',
		data: {},
		user_id: 'admin-001',
		access_grants: [],
		file_ids: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_GROUPS = [
	{
		id: 'group-001',
		name: 'Admins',
		description: 'Administrative users',
		user_ids: ['admin-001'],
		permissions: { models: [], knowledge: true },
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_FUNCTIONS = [
	{
		id: 'func-001',
		name: 'Hello World Function',
		type: 'function',
		description: 'A simple hello world function',
		content: "def hello():\n    return 'Hello, World!'",
		user_id: 'admin-001',
		meta: {},
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_SKILLS = [
	{
		id: 'skill-001',
		name: 'Code Assistant',
		description: 'Helps with coding tasks',
		content: '',
		user_id: 'admin-001',
		meta: {},
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_MEMORIES = [
	{
		id: 'mem-001',
		user_id: 'admin-001',
		content: 'User prefers dark mode',
		type: 'user',
		path: '',
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_NOTES = [
	{
		id: 'note-001',
		title: 'My First Note',
		data: { content: [{ type: 'paragraph', children: [{ text: 'Welcome to notes!' }] }] },
		user_id: 'admin-001',
		meta: {},
		access_grants: [],
		pinned: false,
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_CHANNELS = [
	{
		id: 'channel-001',
		type: 'text',
		name: 'General',
		description: 'General discussion channel',
		is_private: false,
		user_id: 'admin-001',
		data: {},
		meta: {},
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_AUTOMATIONS = [];

export const MOCK_CALENDARS = [
	{
		id: 'cal-001',
		user_id: 'admin-001',
		name: 'My Calendar',
		color: '#4285f4',
		is_default: true,
		is_system: false,
		data: null,
		meta: null,
		access_grants: [],
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_FOLDERS = [
	{
		id: 'folder-001',
		name: 'Work',
		data: {},
		meta: { isExpanded: true },
		parent_id: null,
		user_id: 'admin-001',
		created_at: Date.now(),
		updated_at: Date.now()
	}
];

export const MOCK_UI_CONFIG = {
	default_models: ['stepfun/step-3.7-flash:free'],
	default_prompt_suggestions: [
		'Write a Python script to scrape a website.',
		'Compare and contrast the benefits of cloud computing vs. on-premise solutions.',
		'What are the implications of the recent advancements in AI?',
		'Write a sales pitch for a new line of eco-friendly products.'
	],
	banners: [],
	display_fetched_from: false
};

export const MOCK_CONFIG = {
	status: true,
	version: '0.10.2',
	default_locale: 'en-US',
	features: {
		auth: true,
		enable_signup: true,
		enable_login_form: true,
		enable_oauth_signup: true,
		enable_web_search: true,
		enable_image_generation: true,
		enable_community_sharing: true,
		enable_message_rating: true,
		enable_admin_export: true,
		enable_admin_chat_access: true
	}
};

export const MOCK_CHANGELOG = {
	'0.10.2': {
		date: '2026-07-05',
		added: ['Mock mode enabled', 'Enterprise mocking approach'],
		fixed: ['Splash screen rendering issue']
	}
};

export const MOCK_API_KEYS = [
	{
		id: 'k-001',
		name: 'stst',
		status: 'active',
		trackingId: 'key_e6ECsEGqGCy7J1Nu',
		secretKeyMask: 'sk-proj-...oxQA',
		createdAt: 'Jun 27, 2026',
		lastUsedAt: 'Jun 27, 2026',
		createdBy: 'Machine Generative',
		permissions: 'All'
	}
];

export const MOCK_LOGS = [
	{
		id: 'log-001',
		input: 'hi',
		output:
			'⚠ You exceeded your current quota, please check your plan and billing details. For more information on increasing your quota, visit the usage page.',
		model: 'gpt-5.5-2026-04-23',
		createdAt: 'Jul 3, 9:23 PM',
		status: 'error',
		latencyMs: 312,
		tokens: 0
	},
	{
		id: 'log-002',
		input: 'generate a quicksort algorithm in python',
		output:
			'def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)',
		model: 'gpt-5.5-2026-04-23',
		createdAt: 'Jul 2, 4:15 PM',
		status: 'success',
		latencyMs: 1850,
		tokens: 241
	},
	{
		id: 'log-003',
		input: 'What is the capital of France?',
		output: 'The capital of France is Paris.',
		model: 'gpt-5.5-mini',
		createdAt: 'Jul 1, 11:02 AM',
		status: 'success',
		latencyMs: 420,
		tokens: 32
	}
];

export const MOCK_USAGE = {
	summary: {
		totalSpend: 25.40,
		julySpend: 25.40,
		totalTokens: 1254300,
		totalRequests: 184
	},
	capabilities: [
		{ id: 'completions', name: 'Responses & Chat Completions', requests: 142, detail: '1.1M tokens', trend: 12 },
		{ id: 'images', name: 'Images', requests: 12, detail: '36 images generated', trend: -3 },
		{ id: 'web-search', name: 'Web Searches', requests: 22, detail: '22 web queries', trend: 44 },
		{ id: 'file-search', name: 'File Searches', requests: 8, detail: 'Vector indexing', trend: 0 }
	]
};

export const MOCK_DIRECTORY_MODELS = [
	{
		id: 'openai/gpt-4o',
		name: 'GPT-4o',
		provider: 'OpenAI',
		description: 'GPT-4o is a multimodal model designed to handle complex reasoning tasks, offering unparalleled speed and accuracy.',
		context_length: 128000,
		pricing: { prompt: 5.0, completion: 15.0 },
		capabilities: { vision: true, function_calling: true, json_mode: true },
		rating: 4.8,
		reviews: 42
	},
	{
		id: 'anthropic/claude-3.5-sonnet',
		name: 'Claude 3.5 Sonnet',
		provider: 'Anthropic',
		description: 'The most intelligent model from Anthropic, achieving industry-leading performance on coding and logic benchmarks.',
		context_length: 200000,
		pricing: { prompt: 3.0, completion: 15.0 },
		capabilities: { vision: true, function_calling: true, json_mode: true },
		rating: 4.9,
		reviews: 58
	},
	{
		id: 'google/gemini-1.5-pro',
		name: 'Gemini 1.5 Pro',
		provider: 'Google',
		description: 'Google\'s most capable multimodal model with a massive context window of 2 million tokens.',
		context_length: 2000000,
		pricing: { prompt: 1.25, completion: 5.0 },
		capabilities: { vision: true, function_calling: true, json_mode: false },
		rating: 4.6,
		reviews: 24
	},
	{
		id: 'meta-llama/llama-3.1-405b-instruct',
		name: 'Llama 3.1 405B',
		provider: 'Meta',
		description: 'The largest open-source model available, providing GPT-4 level intelligence with open weights.',
		context_length: 128000,
		pricing: { prompt: 0.8, completion: 0.8 },
		capabilities: { vision: false, function_calling: true, json_mode: true },
		rating: 4.7,
		reviews: 31
	},
	{
		id: 'mistralai/mistral-large-2407',
		name: 'Mistral Large',
		provider: 'Mistral',
		description: 'Mistral\'s flagship model optimized for multi-lingual and programming tasks.',
		context_length: 128000,
		pricing: { prompt: 2.0, completion: 6.0 },
		capabilities: { vision: false, function_calling: true, json_mode: true },
		rating: 4.5,
		reviews: 18
	},
	{
		id: 'cohere/command-r-plus',
		name: 'Command R+',
		provider: 'Cohere',
		description: 'A powerful enterprise model fine-tuned specifically for RAG and tool-use workflows.',
		context_length: 128000,
		pricing: { prompt: 3.0, completion: 15.0 },
		capabilities: { vision: false, function_calling: true, json_mode: true },
		rating: 4.4,
		reviews: 12
	}
];
