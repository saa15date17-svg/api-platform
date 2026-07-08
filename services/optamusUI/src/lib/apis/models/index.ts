import { WEBUI_API_BASE_URL } from '$lib/constants';

export const createNewModel = async (token: string = '', model: any) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/models/create`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify(model)
	}).then(async (res) => {
		if (!res.ok) throw await res.json();
		return res.json();
	});

	return res;
};

export const deleteModelById = async (token: string = '', id: string) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/models/delete`, {
		method: 'DELETE',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({ id })
	}).then(async (res) => {
		if (!res.ok) throw await res.json();
		return res.json();
	});

	return res;
};

export const getModelTags = async (token: string = '') => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/models/tags`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		}
	}).then(async (res) => {
		if (!res.ok) throw await res.json();
		return res.json();
	});

	return res;
};

export const toggleModelById = async (token: string = '', id: string) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/models/toggle`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({ id })
	}).then(async (res) => {
		if (!res.ok) throw await res.json();
		return res.json();
	});

	return res;
};

export const updateModelById = async (token: string = '', id: string, model: any) => {
	const res = await fetch(`${WEBUI_API_BASE_URL}/models/update`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			...(token && { authorization: `Bearer ${token}` })
		},
		body: JSON.stringify({ id, ...model })
	}).then(async (res) => {
		if (!res.ok) throw await res.json();
		return res.json();
	});

	return res;
};

export const getModels = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/models`, {
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
			error = err.detail || err.message || err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getDirectoryModels = async (token: string = '') => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/models/directory`, {
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
			error = err.detail || err.message || err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const getDirectoryModelById = async (token: string = '', id: string) => {
	let error = null;

	const res = await fetch(`${WEBUI_API_BASE_URL}/models/directory/${id}`, {
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
			error = err.detail || err.message || err;
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};
