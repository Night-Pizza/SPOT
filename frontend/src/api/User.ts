import type { UserDTO } from '../types/Authentification';
import { converter } from './Converter';

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
