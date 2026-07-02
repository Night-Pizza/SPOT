import { converter } from './Converter';
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
    const response = await converter(`/attendance/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sessionId,
            payload,
        }),
    });

    await handleApiResponse(response, 'Failed to submit attendance.');
    const data = await response.json();
    return data && typeof data === 'object' && 'payload' in data ? data.payload : data;
}

export async function scanQrAttendance(token: string, payload: AttendancePayload): Promise<any> {
    const response = await converter(`/attendance/scan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            payload,
        }),
    });

    await handleApiResponse(response, 'Failed to submit QR attendance.');
    const data = await response.json();
    return data && typeof data === 'object' && 'payload' in data ? data.payload : data;
}
