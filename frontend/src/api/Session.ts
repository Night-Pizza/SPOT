import { converter } from './Converter';

export type CreateSessionRequest = {
    title: string;
    password?: string;
    latitude?: number;
    longitude?: number;
    allowedRadius?: number;
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

export async function createSession(data: CreateSessionRequest) {
  const response = await converter(`/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Error creating session'));
    }

    return response.json();
}
