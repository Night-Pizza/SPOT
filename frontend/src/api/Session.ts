const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type CreateSessionRequest = {
    title: string;
    password: string | null;
    latitude: number | null;
    longitude: number | null;
    allowedRadius: number | null;
    validationTypes: string[];
};

export type SessionResponse = {
    id: number;
    title: string;
    createdAt: string;
};

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

export async function createSession(data: CreateSessionRequest): Promise<SessionResponse> {
    const response = await fetch(`${API_BASE_URL}/session/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Error creating session'));
    }

    return response.json();
}
