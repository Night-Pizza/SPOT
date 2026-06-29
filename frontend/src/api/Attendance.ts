const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type AttendancePayload = {
    password?: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
};

export type AttendanceResponse = {
    id: number;
    timestamp: string;
};

export class ApiError extends Error {
    status: string;
    constructor(status: string, message: string) {
        super(message);
        this.status = status;
    }
}

async function handleApiResponse(response: Response, fallback: string) {
    if (!response.ok) {
        let status = 'UNEXPECTED_ERROR';
        let message = fallback;
        try {
            const data = await response.json() as { status?: string; message?: string; error?: string };
            status = data.status || 'UNEXPECTED_ERROR';
            message = data.message || data.error || data.status || fallback;
        } catch {
            // ignore
        }
        throw new ApiError(status, message);
    }
}

export async function createAttendance(sessionId: number, payload: AttendancePayload): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/attendance/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sessionId,
            payload,
        }),
    });

    await handleApiResponse(response, 'Failed to submit attendance.');
    return response.json();
}

export async function scanQrAttendance(token: string, payload: AttendancePayload): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/attendance/scan`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            payload,
        }),
    });

    await handleApiResponse(response, 'Failed to submit QR attendance.');
    return response.json();
}
