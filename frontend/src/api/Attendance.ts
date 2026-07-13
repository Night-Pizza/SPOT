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

export type EmailAttendanceRequest = {
    sessionId: number;
    email: string;
};

export type AttendanceSubmitResult = {
    attendanceId?: number;
    requestId?: number;
};

export type AttendanceApiResponse = {
    payload?: AttendanceSubmitResult;
};

export type AttendedSessionHistoryItem = {
    id: number;
    title: string;
    ownerEmail: string;
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

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

function hasAttendancePayload(
    data: AttendanceApiResponse | AttendanceSubmitResult
): data is AttendanceApiResponse & { payload: AttendanceSubmitResult } {
    return 'payload' in data && data.payload !== undefined;
}

function unwrapAttendanceResponse(data: AttendanceApiResponse | AttendanceSubmitResult): AttendanceSubmitResult {
    return hasAttendancePayload(data) ? data.payload : data as AttendanceSubmitResult;
}

export async function createAttendance(sessionId: number, payload: AttendancePayload): Promise<AttendanceSubmitResult> {
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
    const data = await response.json() as AttendanceApiResponse | AttendanceSubmitResult;
    return unwrapAttendanceResponse(data);
}

export async function scanQrAttendance(token: string, payload: AttendancePayload): Promise<AttendanceSubmitResult> {
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
    const data = await response.json() as AttendanceApiResponse | AttendanceSubmitResult;
    return unwrapAttendanceResponse(data);
}

export async function getAttendedSessionsCount(): Promise<number> {
    const response = await converter('/attendance/count', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load attended sessions count'));
    }

    return response.json() as Promise<number>;
}

export async function getAttendedSessions(): Promise<AttendedSessionHistoryItem[]> {
    const response = await converter('/attendance', {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to load attendance history'));
    }

    return response.json() as Promise<AttendedSessionHistoryItem[]>;
}

export async function addAttendeeByEmail(data: EmailAttendanceRequest): Promise<AttendanceResponse> {
    const response = await converter('/attendance/create/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to add attendee.'));
    }

    return response.json() as Promise<AttendanceResponse>;
}

export async function removeAttendeeByEmail(data: EmailAttendanceRequest): Promise<void> {
    const response = await converter('/attendance/delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to remove attendee.'));
    }
}
