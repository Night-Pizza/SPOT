import { converter } from './Converter';
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the prefix "data:image/jpeg;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

export async function registerFace(photos: File[]): Promise<{ success: boolean; requestId?: number }> {
    if (photos.length === 0) {
        throw new Error('No photos captured');
    }
    const base64 = await fileToBase64(photos[0]);
    const response = await converter(`/user/face`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: base64,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to register face');
    }

    const data = await response.json();
    return { success: true, requestId: data.requestId };
}

export async function checkFaceStatus(requestId: number): Promise<{ status: string; errorMessage?: string }> {
    const response = await converter(`/user/face/status/${requestId}`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error('Failed to check face status');
    }
    return response.json();
}

export async function checkAttendanceStatus(requestId: number): Promise<{ status: string; errorMessage?: string }> {
    const response = await converter(`/attendance/status/${requestId}`, {
        method: 'GET',
    });
    if (!response.ok) {
        throw new Error('Failed to check attendance status');
    }
    return response.json();
}