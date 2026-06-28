const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function registerFace(userId: number, photos: File[]): Promise<{ success: boolean }> {
    const formData = new FormData();
    photos.forEach((photo, index) => {
        formData.append(`photo${index}`, photo);
    });
    formData.append('userId', String(userId));

    const response = await fetch(`${API_BASE_URL}/user/face/register`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to register face');
    }

    return response.json();
}

export async function verifyFace(photo: File): Promise<{ verified: boolean }> {
    const formData = new FormData();
    formData.append('photo', photo);

    const response = await fetch(`${API_BASE_URL}/user/face/verify`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Face verification failed');
    }

    return response.json();
}