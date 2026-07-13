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

export type CreatedSessionHistoryItem = {
    id: number;
    title: string;
    ownerEmail: string;
    timestamp: string;
};

export type SessionAttendee = {
    email: string;
};

export type SessionDetails = {
    id: number;
    title: string;
    password: string | null;
    validationTypes: string[] | null;
    latitude: number | null;
    longitude: number | null;
    allowedRadius: number | null;
    createdAt: string;
    isActive: boolean;
};

export type SessionUser = {
    email: string;
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
  const response = await converter(`/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Error creating session'));
    }

    return response.json() as Promise<SessionResponse>;
}

export async function getCreatedSessionsCount(): Promise<number> {
    const response = await converter('/session/count', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load created sessions count'));
    }

    return response.json() as Promise<number>;
}

export async function getCreatedSessions(): Promise<CreatedSessionHistoryItem[]> {
    const response = await converter('/session', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load sessions'));
    }

    return response.json() as Promise<CreatedSessionHistoryItem[]>;
}

export async function getSessionAttendees(sessionId: number): Promise<SessionAttendee[]> {
    const response = await converter(`/attendance/session/${sessionId}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load session attendees'));
    }

    return response.json() as Promise<SessionAttendee[]>;
}

export async function getSessionDetails(sessionId: number): Promise<SessionDetails> {
    const response = await converter(`/session/${sessionId}/details`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load session details.'));
    }

    return response.json() as Promise<SessionDetails>;
}

export async function getSessionUsers(sessionId: number): Promise<SessionUser[]> {
    const response = await converter(`/session/${sessionId}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load checked-in users.'));
    }

    return response.json() as Promise<SessionUser[]>;
}

export async function closeSession(sessionId: number): Promise<void> {
    const response = await converter(`/session/close/${sessionId}`, {
        method: 'PATCH',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to end session.'));
    }
}

export async function getActiveSessionIds(): Promise<number[]> {
    const response = await converter('/session/alla', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load active sessions.'));
    }

    return response.json() as Promise<number[]>;
}
