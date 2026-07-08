import { WEBUI_API_BASE_URL } from '$lib/constants';

// Response type from backend (snake_case)
interface BackendApiKey {
	id: string;
	user_id: string;
	name: string;
	key_prefix: string;
	is_active: boolean;
	spending_limit: number | null;
	created_at: number;
}

// Map backend snake_case → frontend camelCase
function mapKey(k: BackendApiKey) {
	return {
		id: k.id,
		name: k.name,
		status: k.is_active ? 'active' : 'revoked',
		trackingId: k.id,
		secretKeyMask: `${k.key_prefix}...`,
		createdAt: new Date(k.created_at * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}),
		lastUsedAt: null,
		createdBy: k.user_id,
		permissions: 'All',
		spendingLimit: k.spending_limit
	};
}

export const getApiKeys = async (token: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/keys/`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	// Backend returns { keys: [...] }
	return (res?.keys ?? []).map(mapKey);
};

export const createApiKey = async (
	token: string,
	name: string,
	userId?: string,
	spendingLimit?: number
) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/keys/`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({
			name,
			user_id: userId || 'self',
			spending_limit: spendingLimit ?? null
		})
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	if (!res) return null;
	// Backend returns { id, user_id, name, key, is_active, spending_limit, created_at }
	// key is the raw secret — expose it only on creation
	return {
		id: res.id,
		name: res.name,
		status: res.is_active ? 'active' : 'revoked',
		trackingId: res.id,
		secretKeyMask: res.key ? `${res.key.substring(0, 12)}...${res.key.slice(-4)}` : '****...',
		createdAt: new Date(res.created_at * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}),
		lastUsedAt: null,
		createdBy: res.user_id,
		permissions: 'All',
		spendingLimit: res.spending_limit,
		_raw: res.key // expose raw key only at creation time
	};
};

export const deleteApiKey = async (token: string, id: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/keys/${id}`, {
		method: 'DELETE',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err.detail;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};
