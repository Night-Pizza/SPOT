import { converter } from './Converter';

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

export async function getRegistrationOptions(): Promise<{ optionsJson: string }> {
    const response = await converter('/webauth/register/options', { method: 'GET' });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to fetch registration options'));
    }
    return response.json();
}

export async function verifyRegistration(responseJson: string): Promise<void> {
    const response = await converter('/webauth/register/verify', {
        method: 'POST',
        body: JSON.stringify({ responseJson }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Registration verification failed'));
    }
}

export async function getAssertionOptions(): Promise<{ optionsJson: string }> {
    const response = await converter('/webauth/attendance/options', { method: 'GET' });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to fetch assertion options'));
    }
    return response.json();
}

export async function verifyAssertion(responseJson: string): Promise<void> {
    const response = await converter('/webauth/attendance/verify', {
        method: 'POST',
        body: JSON.stringify({ responseJson }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Assertion verification failed'));
    }
}
