import type { UserDTO } from '../types/Authentification';
import { converter } from './Converter';

export type UpdatePasswordRequest = {
    currentPassword: string;
    newPassword: string;
};

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

export async function getCurrentUser(): Promise<UserDTO> {
    const response = await converter(`/user/me`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load current user'));
    }

    return response.json();
}

export async function updatePassword(data: UpdatePasswordRequest): Promise<UserDTO> {
    const response = await converter('/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to change password'));
    }

    return response.json() as Promise<UserDTO>;
}

export async function searchUsers(query: string): Promise<UserDTO[]> {
    if (!query) return [];
    const response = await converter(`/user/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to search users'));
    }

    return response.json() as Promise<UserDTO[]>;
}
