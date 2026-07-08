import { WEBUI_API_BASE_URL } from '$lib/constants';

export interface UsageSummary {
	totalSpend: number;
	julySpend: number;
	totalTokens: number;
	totalRequests: number;
}

export interface UsageCapability {
	id: string;
	name: string;
	requests: number;
	detail: string;
	trend: number;
}

export interface UsageResponse {
	summary: UsageSummary;
	capabilities: UsageCapability[];
}

export const getUsage = async (token: string): Promise<UsageResponse | null> => {
	let error = null;

	// Backend exposes this at /api/v1/usage/stats (registered at /api/v1/usage with prefix)
	const res = await fetch(`${WEBUI_API_BASE_URL}/usage/stats`, {
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
			error = err?.detail ?? err;
			console.log(err);
			return null;
		});

	if (error) {
		throw error;
	}

	if (!res) return null;

	// Map backend shape { total_requests, total_tokens, total_cost } to frontend shape
	const summary: UsageSummary = {
		totalRequests: res.total_requests ?? 0,
		totalTokens: res.total_tokens ?? 0,
		totalSpend: res.total_cost ?? 0,
		julySpend: 0 // not available from backend yet
	};

	// Capabilities breakdown is not yet in the backend — return empty for now
	const capabilities: UsageCapability[] = [];

	return { summary, capabilities };
};
