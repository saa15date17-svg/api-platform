// ============================================================================
// Comprehensive API Type Definitions for OptamusUI
// Generated from frontend API modules and backend Pydantic models
// ============================================================================

// ── Shared / Common Types ──────────────────────────────────────────────────

/** Access grant entry used for resource-level permission control */
export interface AccessGrant {
	target_type: 'user' | 'group';
	target_id: string;
	permission: 'read' | 'write';
}

/** Standard error response from the API */
export interface ApiError {
	detail: string | Record<string, unknown> | Array<{ msg: string }>;
}

/** Paginated list response wrapper */
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
}

/** Role options for users */
export type UserRole = 'admin' | 'user' | 'pending';

// ── Auth Types ─────────────────────────────────────────────────────────────

/** Session user response from GET /auths/ */
export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	profile_image_url: string;
	last_active_at: number;
	updated_at: number;
	created_at: number;
}

/** Sign-in form sent to POST /auths/signin */
export interface SignInForm {
	email: string;
	password: string;
}

/** LDAP sign-in form sent to POST /auths/ldap */
export interface LdapSignInForm {
	user: string;
	password: string;
}

/** Sign-in response (token + user info) */
export interface SignInResponse {
	token: string;
	token_type: string;
	id: string;
	email: string;
	name: string;
	role: UserRole;
	profile_image_url: string;
}

/** Sign-up form sent to POST /auths/signup */
export interface SignUpForm {
	name: string;
	email: string;
	password: string;
	profile_image_url: string;
}

/** Add user form (admin) sent to POST /auths/add */
export interface AddUserForm {
	name: string;
	email: string;
	password: string;
	role?: UserRole;
	profile_image_url?: string | null;
}

/** Update profile form sent to POST /auths/update/profile */
export interface UpdateProfileForm {
	profile_image_url: string;
	name: string;
	bio?: string;
	gender?: string;
	date_of_birth?: string;
}

/** Update password form sent to POST /auths/update/password */
export interface UpdatePasswordForm {
	password: string;
	new_password: string;
}

/** Admin details response from GET /auths/admin/details */
export interface AdminDetails {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	profile_image_url: string;
}

/** Admin config response from GET /auths/admin/config */
export interface AdminConfig {
	[key: string]: unknown;
}

/** LDAP config response from GET /auths/admin/config/ldap */
export interface LdapConfig {
	[key: string]: unknown;
}

/** LDAP server config */
export interface LdapServerConfig {
	[key: string]: unknown;
}

/** OAuth config response from GET /auths/admin/config/oauth */
export interface OAuthConfig {
	[key: string]: unknown;
}

/** API key response from GET /auths/api_key */
export interface ApiKeyResponse {
	api_key: string;
}

// ── User Types ─────────────────────────────────────────────────────────────

/** Full user model from the backend */
export interface UserModel {
	id: string;
	email: string;
	username?: string | null;
	role: UserRole;
	name: string;
	profile_image_url?: string | null;
	profile_banner_image_url?: string | null;
	bio?: string | null;
	gender?: string | null;
	date_of_birth?: string | null;
	timezone?: string | null;
	presence_state?: string | null;
	status_emoji?: string | null;
	status_message?: string | null;
	status_expires_at?: number | null;
	info?: Record<string, unknown> | null;
	settings?: UserSettings | null;
	oauth?: Record<string, unknown> | null;
	scim?: Record<string, unknown> | null;
	last_active_at: number;
	updated_at: number;
	created_at: number;
}

/** User settings */
export interface UserSettings {
	ui?: Record<string, unknown>;
	[key: string]: unknown;
}

/** User model with group IDs */
export interface UserWithGroups extends UserModel {
	group_ids: string[];
}

/** User list response */
export interface UserListResponse {
	users: UserModel[];
	total: number;
}

/** User info response from GET /users/user/info */
export interface UserInfo {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	bio?: string;
	groups?: string[];
	is_active: boolean;
	status_emoji?: string | null;
	status_message?: string | null;
	status_expires_at?: number | null;
}

/** User status update form */
export interface UserStatusForm {
	status_emoji?: string | null;
	status_message?: string | null;
	status_expires_at?: number | null;
}

/** User update form (admin) */
export interface UserUpdateForm {
	role?: UserRole;
	name?: string;
	email?: string;
	profile_image_url?: string;
	password?: string;
}

/** User active status response */
export interface UserActiveStatus {
	id: string;
	name: string;
	is_active: boolean | null;
	status_emoji?: string | null;
	status_message?: string | null;
	status_expires_at?: number | null;
}

/** User preview response */
export interface UserPreview {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	profile_image_url: string;
}

// ── Chat Types ─────────────────────────────────────────────────────────────

/** Chat model from the backend */
export interface ChatModel {
	id: string;
	user_id: string;
	title: string;
	chat: Record<string, unknown>;
	created_at: number;
	updated_at: number;
	share_id?: string | null;
	archived: boolean;
	pinned?: boolean | null;
	meta?: Record<string, unknown>;
	folder_id?: string | null;
	tasks?: unknown[] | null;
	summary?: string | null;
	last_read_at?: number | null;
}

/** Chat with time_range added by the frontend */
export interface ChatListItem extends ChatModel {
	time_range: string;
}

/** Chat title-id response for list views */
export interface ChatTitleIdResponse {
	id: string;
	title: string;
	updated_at: number;
	created_at: number;
	last_read_at?: number | null;
	snippet?: string | null;
}

/** Shared chat response */
export interface SharedChatResponse {
	id: string;
	title: string;
	share_id?: string | null;
	updated_at: number;
	created_at: number;
}

/** Chat config from GET /chats/config */
export interface ChatConfig {
	[key: string]: unknown;
}

/** Create new chat form sent to POST /chats/new */
export interface CreateChatForm {
	chat: Record<string, unknown>;
	folder_id?: string | null;
}

/** Import chat form */
export interface ChatImportForm {
	chat: Record<string, unknown>;
	meta?: Record<string, unknown>;
	pinned?: boolean;
	created_at?: number;
	updated_at?: number;
	folder_id?: string | null;
}

/** Chat access grant */
export interface ChatAccessGrant extends AccessGrant {}

/** Chat usage stats response */
export interface ChatUsageStats {
	id: string;
	models: Record<string, number>;
	message_count: number;
	history_models: Record<string, number>;
	history_message_count: number;
	history_user_message_count: number;
	history_assistant_message_count: number;
	average_response_time: number;
	average_user_message_content_length: number;
	average_assistant_message_content_length: number;
	tags: string[];
	last_message_at: number;
	updated_at: number;
	created_at: number;
}

/** Chat tag */
export interface ChatTag {
	id: string;
	name: string;
	user_id: string;
}

// ── Model Types ────────────────────────────────────────────────────────────

/** Model metadata */
export interface ModelMeta {
	profile_image_url?: string | null;
	description?: string | null;
	capabilities?: Record<string, unknown> | null;
	tags?: Array<{ name: string }>;
	[key: string]: unknown;
}

/** Model parameters */
export interface ModelParams {
	[key: string]: unknown;
}

/** Model from the workspace */
export interface ModelModel {
	id: string;
	user_id: string;
	base_model_id?: string | null;
	name: string;
	params: ModelParams;
	meta: ModelMeta;
	access_grants: AccessGrant[];
	is_active: boolean;
	updated_at: number;
	created_at: number;
}

/** Model with user info */
export interface ModelUserResponse extends ModelModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Model access response with write_access flag */
export interface ModelAccessResponse extends ModelUserResponse {
	write_access?: boolean;
}

/** Model list response */
export interface ModelListResponse {
	items: ModelUserResponse[];
	total: number;
}

/** Create model form */
export interface ModelForm {
	id: string;
	base_model_id?: string | null;
	name: string;
	meta: ModelMeta;
	params?: ModelParams;
	access_grants?: AccessGrant[];
	is_active?: boolean;
}

/** Base model entry */
export interface BaseModel {
	id: string;
	name?: string;
	tags?: string[];
	[key: string]: unknown;
}

/** Model tag */
export interface ModelTag {
	name: string;
}

// ── File Types ─────────────────────────────────────────────────────────────

/** File model from the backend */
export interface FileModel {
	id: string;
	user_id: string;
	hash?: string | null;
	filename: string;
	path?: string | null;
	data?: Record<string, unknown> | null;
	meta?: FileMeta | null;
	created_at: number | null;
	updated_at: number | null;
}

/** File metadata */
export interface FileMeta {
	name?: string | null;
	content_type?: string | null;
	size?: number | null;
	[key: string]: unknown;
}

/** File response (without full data) */
export interface FileResponse {
	id: string;
	user_id: string;
	hash?: string | null;
	filename: string;
	data?: Record<string, unknown> | null;
	meta?: FileMeta | null;
	created_at: number;
	updated_at?: number | null;
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** File list response */
export interface FileListResponse {
	items: FileResponse[];
	total: number;
}

/** File metadata response */
export interface FileMetadataResponse {
	id: string;
	hash?: string | null;
	meta?: Record<string, unknown> | null;
	created_at: number;
	updated_at: number;
}

// ── Prompt Types ───────────────────────────────────────────────────────────

/** Prompt model from the backend */
export interface PromptModel {
	id?: string;
	command: string;
	user_id: string;
	name: string;
	content: string;
	data?: Record<string, unknown> | null;
	meta?: Record<string, unknown> | null;
	tags?: (string | null)[] | null;
	is_active?: boolean;
	version_id?: string | null;
	created_at?: number | null;
	updated_at?: number | null;
	access_grants: AccessGrant[];
}

/** Prompt form sent to create/update */
export interface PromptForm {
	id?: string;
	command: string;
	name: string;
	content: string;
	data?: Record<string, unknown> | null;
	meta?: Record<string, unknown> | null;
	tags?: (string | null)[];
	access_grants?: AccessGrant[];
	version_id?: string | null;
	commit_message?: string | null;
	is_production?: boolean;
}

/** Prompt with user info */
export interface PromptUserResponse extends PromptModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Prompt history entry */
export interface PromptHistoryEntry {
	id: string;
	prompt_id: string;
	parent_id: string | null;
	snapshot: {
		name: string;
		content: string;
		command: string;
		data: Record<string, unknown>;
		meta: Record<string, unknown>;
		access_grants: AccessGrant[];
	};
	user_id: string;
	commit_message: string | null;
	created_at: number;
	user?: {
		id: string;
		name: string;
		email: string;
	};
}

/** Prompt diff between two versions */
export interface PromptDiff {
	from_id: string;
	to_id: string;
	from_snapshot: Record<string, unknown>;
	to_snapshot: Record<string, unknown>;
	content_diff: string[];
	name_changed: boolean;
	access_grants_changed: boolean;
}

// ── Tool Types ─────────────────────────────────────────────────────────────

/** Tool model from the backend */
export interface ToolModel {
	id: string;
	user_id: string;
	name: string;
	content: string;
	specs: Record<string, unknown>[];
	meta: ToolMeta;
	access_grants: AccessGrant[];
	updated_at: number;
	created_at: number;
}

/** Tool metadata */
export interface ToolMeta {
	description?: string | null;
	manifest?: Record<string, unknown>;
	has_user_valves?: boolean;
}

/** Tool with user info */
export interface ToolUserResponse extends ToolModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Tool form sent to create/update */
export interface ToolForm {
	id: string;
	name: string;
	content: string;
	meta: ToolMeta;
	access_grants?: AccessGrant[];
}

/** Tool valves response */
export interface ToolValves {
	[key: string]: unknown;
}

// ── Function Types ─────────────────────────────────────────────────────────

/** Function model from the backend */
export interface FunctionModel {
	id: string;
	user_id: string;
	name: string;
	type: string;
	content: string;
	meta: FunctionMeta;
	is_active: boolean;
	is_global: boolean;
	updated_at: number;
	created_at: number;
}

/** Function metadata */
export interface FunctionMeta {
	description?: string | null;
	manifest?: Record<string, unknown>;
	[key: string]: unknown;
}

/** Function with valves */
export interface FunctionWithValves extends FunctionModel {
	valves?: Record<string, unknown> | null;
}

/** Function response (without content) */
export interface FunctionResponse {
	id: string;
	user_id: string;
	type: string;
	name: string;
	meta: FunctionMeta;
	is_active: boolean;
	is_global: boolean;
	updated_at: number;
	created_at: number;
}

/** Function with user info */
export interface FunctionUserResponse extends FunctionResponse {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Function form sent to create/update */
export interface FunctionForm {
	id: string;
	name: string;
	content: string;
	meta: FunctionMeta;
}

// ── Knowledge Types ────────────────────────────────────────────────────────

/** Knowledge base model */
export interface KnowledgeModel {
	id: string;
	user_id: string;
	name: string;
	description: string;
	meta?: Record<string, unknown> | null;
	access_grants: AccessGrant[];
	created_at: number;
	updated_at: number;
}

/** Knowledge base with user info */
export interface KnowledgeUserModel extends KnowledgeModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Knowledge response with files */
export interface KnowledgeResponse extends KnowledgeModel {
	files?: Array<FileMetadataResponse | Record<string, unknown>> | null;
}

/** Knowledge list response */
export interface KnowledgeListResponse {
	items: KnowledgeUserModel[];
	total: number;
}

/** Knowledge file model */
export interface KnowledgeFileModel {
	id: string;
	knowledge_id: string;
	file_id: string;
	directory_id?: string | null;
	user_id: string;
	created_at: number;
	updated_at: number;
}

/** Knowledge directory model */
export interface KnowledgeDirectoryModel {
	id: string;
	knowledge_id: string;
	parent_id?: string | null;
	name: string;
	user_id: string;
	created_at: number;
	updated_at: number;
}

/** Knowledge file list response */
export interface KnowledgeFileListResponse {
	items: FileUserResponse[];
	directories?: KnowledgeDirectoryModel[];
	breadcrumbs?: KnowledgeDirectoryModel[];
	total: number;
}

/** File with user info */
export interface FileUserResponse extends FileResponse {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
	collection?: Record<string, unknown>;
}

/** Knowledge update form */
export interface KnowledgeUpdateForm {
	name?: string;
	description?: string;
	data?: Record<string, unknown>;
	access_grants?: AccessGrant[];
}

/** Knowledge directory form */
export interface KnowledgeDirectoryForm {
	name: string;
	parent_id?: string | null;
}

/** Sync manifest entry */
export interface SyncManifestEntry {
	filename: string;
	path: string;
	checksum: string;
	size: number;
}

/** External knowledge connection */
export interface ExternalKnowledgeConnection {
	[key: string]: unknown;
}

/** External knowledge source */
export interface ExternalKnowledgeSource {
	[key: string]: unknown;
}

// ── Note Types ─────────────────────────────────────────────────────────────

/** Note model from the backend */
export interface NoteModel {
	id: string;
	user_id: string;
	title: string;
	data?: Record<string, unknown> | null;
	meta?: Record<string, unknown> | null;
	is_pinned?: boolean;
	access_grants: AccessGrant[];
	created_at: number;
	updated_at: number;
}

/** Note with user info */
export interface NoteUserResponse extends NoteModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Note form sent to create/update */
export interface NoteForm {
	title: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
}

/** Note item response */
export interface NoteItemResponse {
	id: string;
	title: string;
	data?: Record<string, unknown>;
	is_pinned?: boolean;
	updated_at: number;
	created_at: number;
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Note list response */
export interface NoteListResponse {
	items: NoteUserResponse[];
	total: number;
}

// ── Group Types ────────────────────────────────────────────────────────────

/** Group model */
export interface GroupModel {
	id: string;
	user_id: string;
	name: string;
	description: string;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
	created_at: number;
	updated_at: number;
}

/** Group with user info */
export interface GroupUserResponse extends GroupModel {
	user?: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	} | null;
}

/** Group form */
export interface GroupForm {
	name?: string;
	description?: string;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
}

// ── Folder Types ───────────────────────────────────────────────────────────

/** Folder form */
export interface FolderForm {
	name?: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	parent_id?: string | null;
}

/** Folder model */
export interface FolderModel {
	id: string;
	user_id: string;
	name: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	parent_id?: string | null;
	is_expanded?: boolean;
	access_grants?: AccessGrant[];
	created_at: number;
	updated_at: number;
}

// ── Channel Types ──────────────────────────────────────────────────────────

/** Channel form */
export interface ChannelForm {
	type?: string;
	name: string;
	is_private?: boolean | null;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
	group_ids?: string[];
	user_ids?: string[];
}

/** Channel model */
export interface ChannelModel {
	id: string;
	user_id: string;
	name: string;
	type?: string;
	is_private?: boolean;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
	created_at: number;
	updated_at: number;
}

/** Channel message form */
export interface ChannelMessageForm {
	temp_id?: string;
	reply_to_id?: string;
	parent_id?: string;
	content: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
}

/** Channel message model */
export interface ChannelMessageModel {
	id: string;
	channel_id: string;
	user_id: string;
	content: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	reply_to_id?: string | null;
	parent_id?: string | null;
	is_pinned?: boolean;
	created_at: number;
	updated_at: number;
}

/** Channel webhook form */
export interface ChannelWebhookForm {
	name: string;
	profile_image_url?: string;
}

/** Channel member */
export interface ChannelMember {
	id: string;
	channel_id: string;
	user_id?: string;
	group_id?: string;
	is_active?: boolean;
	created_at: number;
	updated_at: number;
}

// ── Memory Types ───────────────────────────────────────────────────────────

/** Memory model */
export interface MemoryModel {
	id: string;
	user_id: string;
	content: string;
	type?: string;
	path?: string;
	embedding?: number[];
	created_at: number;
	updated_at: number;
}

/** Add memory form */
export interface AddMemoryForm {
	content: string;
	type?: string;
	path?: string;
}

// ── Skill Types ────────────────────────────────────────────────────────────

/** Skill model */
export interface SkillModel {
	id: string;
	user_id: string;
	name: string;
	content?: string;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
	updated_at: number;
	created_at: number;
}

/** Skill form */
export interface SkillForm {
	id: string;
	name: string;
	content?: string;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
}

// ── Automation Types ───────────────────────────────────────────────────────

/** Automation terminal config */
export interface AutomationTerminalConfig {
	server_id: string;
	cwd?: string;
}

/** Automation data */
export interface AutomationData {
	prompt: string;
	model_id: string;
	rrule: string;
	terminal?: AutomationTerminalConfig;
}

/** Automation form */
export interface AutomationForm {
	name: string;
	data: AutomationData;
	meta?: {
		system_prompt?: string;
		temperature?: number;
		max_tokens?: number;
		webhook?: string;
	};
	is_active?: boolean;
}

/** Automation run model */
export interface AutomationRunModel {
	id: string;
	automation_id: string;
	chat_id: string | null;
	status: string;
	error: string | null;
	created_at: number;
}

/** Automation response */
export interface AutomationResponse {
	id: string;
	user_id: string;
	name: string;
	data: AutomationData;
	meta?: Record<string, unknown> | null;
	is_active: boolean;
	last_run_at: number | null;
	next_run_at: number | null;
	created_at: number;
	updated_at: number;
	last_run: AutomationRunModel | null;
	next_runs: number[] | null;
}

/** Automation list response */
export interface AutomationListResponse {
	items: AutomationResponse[];
	total: number;
}

// ── Calendar Types ─────────────────────────────────────────────────────────

/** Calendar model */
export interface CalendarModel {
	id: string;
	user_id: string;
	name: string;
	color: string | null;
	is_default: boolean;
	is_system: boolean;
	data: Record<string, unknown> | null;
	meta: Record<string, unknown> | null;
	access_grants: AccessGrant[];
	created_at: number;
	updated_at: number;
}

/** Calendar form */
export interface CalendarForm {
	name: string;
	color?: string;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	access_grants?: AccessGrant[];
}

/** Calendar event model */
export interface CalendarEventModel {
	id: string;
	calendar_id: string;
	user_id: string;
	title: string;
	description: string | null;
	start_at: number;
	end_at: number | null;
	all_day: boolean;
	rrule: string | null;
	color: string | null;
	location: string | null;
	data: Record<string, unknown> | null;
	meta: Record<string, unknown> | null;
	is_cancelled: boolean;
	attendees: CalendarEventAttendee[];
	created_at: number;
	updated_at: number;
	instance_id?: string;
}

/** Calendar event attendee */
export interface CalendarEventAttendee {
	id: string;
	event_id: string;
	user_id: string;
	status: string;
	meta: Record<string, unknown> | null;
	created_at: number;
	updated_at: number;
}

/** Calendar event form */
export interface CalendarEventForm {
	calendar_id: string;
	title: string;
	description?: string | null;
	start_at: number;
	end_at?: number;
	all_day?: boolean;
	rrule?: string;
	color?: string;
	location?: string | null;
	data?: Record<string, unknown>;
	meta?: Record<string, unknown>;
	attendees?: { user_id: string; status?: string }[];
}

/** Calendar event list response */
export interface CalendarEventListResponse {
	items: CalendarEventModel[];
	total: number;
}

// ── Config Types ───────────────────────────────────────────────────────────

/** OpenAI config */
export interface OpenAIConfig {
	ENABLE_OPENAI_API: boolean;
	OPENAI_API_BASE_URLS: string[];
	OPENAI_API_KEYS: string[];
	OPENAI_API_CONFIGS: Record<string, unknown>;
}

/** Ollama config */
export interface OllamaConfig {
	ENABLE_OLLAMA_API: boolean;
	OLLAMA_BASE_URLS: string[];
	OLLAMA_API_CONFIGS: Record<string, unknown>;
}

/** Connection config */
export interface ConnectionConfig {
	[key: string]: unknown;
}

/** Tool server connection */
export interface ToolServerConnection {
	id: string;
	url: string;
	path?: string;
	key?: string;
	config?: {
		enable?: boolean;
	};
	auth_type?: string;
	spec_type?: string;
	spec?: string;
	[key: string]: unknown;
}

/** Terminal server connection */
export interface TerminalServerConnection {
	id: string;
	url: string;
	key?: string;
	config?: {
		enable?: boolean;
	};
	auth_type?: string;
	[key: string]: unknown;
}

/** Code execution config */
export interface CodeExecutionConfig {
	[key: string]: unknown;
}

/** Models config */
export interface ModelsConfig {
	[key: string]: unknown;
}

/** Banner */
export interface Banner {
	id: string;
	type: string;
	title?: string;
	content: string;
	url?: string;
	dismissible?: boolean;
	timestamp: number;
}

/** RAG config */
export interface RAGConfig {
	PDF_EXTRACT_IMAGES?: boolean;
	ENABLE_GOOGLE_DRIVE_INTEGRATION?: boolean;
	ENABLE_ONEDRIVE_INTEGRATION?: boolean;
	EXTERNAL_DOCUMENT_LOADER_HEADERS?: Record<string, string>;
	chunk?: {
		chunk_size: number;
		chunk_overlap: number;
	};
	content_extraction?: {
		engine: string;
		tika_server_url: string | null;
		document_intelligence_config?: {
			key: string;
			endpoint: string;
			model: string;
		} | null;
	};
	web_loader_ssl_verification?: boolean;
	web?: Record<string, unknown>;
	youtube?: {
		language: string[];
		translation?: string | null;
		proxy_url: string;
	};
}

/** Embedding config */
export interface EmbeddingConfig {
	openai_config?: {
		key: string;
		url: string;
	};
	azure_openai_config?: {
		key: string;
		url: string;
		version: string;
	};
	embedding_engine: string;
	embedding_model: string;
	embedding_batch_size?: number;
}

/** Reranking config */
export interface RerankingConfig {
	reranking_model: string;
}

/** Query settings */
export interface QuerySettings {
	k: number | null;
	r: number | null;
	template: string | null;
}

/** Register OAuth client form */
export interface RegisterOAuthClientForm {
	url: string;
	client_id: string;
	client_name?: string;
	client_secret?: string;
	oauth_server_url?: string;
	oauth_scope?: string;
}

/** Evaluation config */
export interface EvaluationConfig {
	[key: string]: unknown;
}

// ── Feedback Types ─────────────────────────────────────────────────────────

/** Feedback model */
export interface FeedbackModel {
	id: string;
	user_id: string;
	service_id: string;
	model_id?: string;
	message_id?: string;
	rating: number;
	form_data?: Record<string, unknown>;
	data?: Record<string, unknown>;
	created_at: number;
	updated_at: number;
}

/** Feedback form */
export interface FeedbackForm {
	service_id: string;
	model_id?: string;
	message_id?: string;
	rating: number;
	form_data?: Record<string, unknown>;
	data?: Record<string, unknown>;
}

// ── Streaming / SSE Types ─────────────────────────────────────────────────

/** Text stream update from chat completion SSE */
export interface TextStreamUpdate {
	done: boolean;
	value: string;
	sources?: unknown;
	selectedModelId?: unknown;
	error?: unknown;
	usage?: ResponseUsage;
}

/** Token usage from OpenAI-style response */
export interface ResponseUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	[key: string]: unknown;
}

/** OpenAI chat completion message */
export interface ChatCompletionMessage {
	role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
	content?: string | null;
	name?: string;
	function_call?: {
		name: string;
		arguments: string;
	};
	tool_calls?: Array<{
		id: string;
		type: 'function';
		function: {
			name: string;
			arguments: string;
		};
	}>;
	tool_call_id?: string;
}

/** Chat completion request body */
export interface ChatCompletionRequest {
	model: string;
	messages: ChatCompletionMessage[];
	stream?: boolean;
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stop?: string | string[];
	n?: number;
	[key: string]: unknown;
}

/** Chat completed form sent to POST /api/chat/completed */
export interface ChatCompletedForm {
	model: string;
	messages: Record<string, unknown>[];
	chat_id: string;
	session_id?: string;
	id: string;
	filter_ids?: string[];
	model_item?: unknown;
}

/** Chat action form */
export interface ChatActionForm {
	model: string;
	messages: string[];
	chat_id: string;
}

// ── Analytics Types ────────────────────────────────────────────────────────

/** Analytics model data */
export interface ModelAnalytics {
	[key: string]: unknown;
}

/** Analytics user data */
export interface UserAnalytics {
	[key: string]: unknown;
}

/** Analytics message data */
export interface MessageAnalytics {
	[key: string]: unknown;
}

/** Analytics summary */
export interface AnalyticsSummary {
	[key: string]: unknown;
}

/** Daily stats */
export interface DailyStats {
	[key: string]: unknown;
}

/** Token usage stats */
export interface TokenUsageStats {
	[key: string]: unknown;
}

/** Model chats response */
export interface ModelChatsResponse {
	[key: string]: unknown;
}

/** Model overview */
export interface ModelOverview {
	[key: string]: unknown;
}

// ── Event Types ────────────────────────────────────────────────────────────

/** Event catalog item */
export interface EventCatalogItem {
	event: string;
	description: string;
	message: string;
}

/** Event webhook */
export interface EventWebhook {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	events: string[];
	targets: EventWebhookTarget[] | null;
	created_at?: number;
	updated_at?: number;
}

/** Event webhook target */
export interface EventWebhookTarget {
	type: 'user' | 'group';
	id: string;
}

// ── Retrieval / RAG Types ─────────────────────────────────────────────────

/** Search document result */
export interface SearchDocument {
	status: boolean;
	collection_name: string;
	filenames: string[];
}

/** Query result */
export interface QueryResult {
	[key: string]: unknown;
}

// ── Audio Types ────────────────────────────────────────────────────────────

/** Audio config */
export interface AudioConfig {
	[key: string]: unknown;
}

/** Audio OpenAI config form */
export interface AudioOpenAIConfigForm {
	url: string;
	key: string;
	model: string;
	speaker: string;
}

/** Available audio models response */
export interface AvailableAudioModelsResponse {
	models: Array<{ name: string; id: string } | { id: string }>;
}

// ── Image Types ────────────────────────────────────────────────────────────

/** Image generation config */
export interface ImageGenerationConfig {
	[key: string]: unknown;
}

/** Image generation result */
export interface ImageGenerationResult {
	[key: string]: unknown;
}

// ── Task Types ─────────────────────────────────────────────────────────────

/** Task config */
export interface TaskConfig {
	[key: string]: unknown;
}

/** Active chats check response */
export interface ActiveChatsResponse {
	[key: string]: unknown;
}

// ── Pipeline Types ─────────────────────────────────────────────────────────

/** Pipeline model */
export interface PipelineModel {
	id: string;
	name: string;
	type?: string;
	meta?: Record<string, unknown>;
	[valves: string]: unknown;
}

/** Pipeline valves */
export interface PipelineValves {
	[key: string]: unknown;
}

// ── WebSocket Event Types ──────────────────────────────────────────────────

/** WebSocket event types */
export type WSEventType =
	| 'chat:new'
	| 'chat:update'
	| 'chat:delete'
	| 'user:update'
	| 'user:active'
	| 'user:inactive'
	| 'model:update'
	| 'model:delete'
	| 'file:upload'
	| 'file:delete'
	| 'channel:message'
	| 'channel:member:update'
	| 'notification';

/** WebSocket event payload */
export interface WSEvent {
	type: WSEventType;
	data: Record<string, unknown>;
}

// ── Re-export existing types ──────────────────────────────────────────────

export type { Banner } from '$lib/types';
