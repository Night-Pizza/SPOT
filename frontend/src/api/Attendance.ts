const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type AttendancePayload = {
    password?: string;
    latitude?: number;
    longitude?: number;
};

export type AttendanceResponse = {
    id: number;
    timestamp: string;
};

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

export async function createAttendance(sessionId: number, payload: AttendancePayload): Promise<AttendanceResponse> {
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

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to submit attendance.'));
    }

    return response.json();
}

export async function scanQrAttendance(token: string, payload: AttendancePayload): Promise<AttendanceResponse> {
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

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to submit QR attendance.'));
    }

    return response.json();
}
