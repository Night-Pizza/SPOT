import type { UserDTO } from '../types/Authentification';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

export async function getCurrentUser(): Promise<UserDTO> {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load current user'));
    }

    return response.json();
}
