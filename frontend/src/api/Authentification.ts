import type { UserCreateDTO, UserDTO, UserLoginDTO } from '../types/Authentification';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getCookie(name: string): string | null {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));

    return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export async function loginUser(data: UserLoginDTO): Promise<UserDTO> {
    const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Ignore
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

export async function registerUser(data: UserCreateDTO): Promise<UserDTO> {
    const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Игнорируем ошибку парсинга
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

export async function fetchXsrfToken(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch XSRF token');
    }

    const token = getCookie('XSRF-TOKEN');

    if (!token) {
        throw new Error('XSRF-TOKEN not found in cookies');
    }

    return token;
}
