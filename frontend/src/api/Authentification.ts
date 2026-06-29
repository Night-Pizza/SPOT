import type { UserCreateDTO, UserDTO, UserLoginDTO } from '../types/Authentification';
import { converter } from './Converter';

function getCookie(name: string): string | null {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));

    return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export async function loginUser(data: UserLoginDTO): Promise<UserDTO> {
    const response = await converter(`/user/login`, {
        method: 'POST',
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
    const response = await converter(`/user/register`, {
        method: 'POST',
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

export async function converterXsrfToken(): Promise<string> {
    const response = await converter(`/auth/csrf`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to converter XSRF token');
    }

    const token = getCookie('XSRF-TOKEN');

    if (!token) {
        throw new Error('XSRF-TOKEN not found in cookies');
    }

    return token;
}

export async function logoutUser(): Promise<void> {
    const response = await converter(`/user/logout`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error('Failed to logout user');
    }
}
