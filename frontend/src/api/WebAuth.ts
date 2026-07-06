import { converter } from './Converter';

async function readErrorMessage(response: Response, fallback: string) {
    try {
        const data = await response.json() as { message?: string; error?: string; status?: string };
        return data.message || data.error || data.status || fallback;
    } catch {
        return fallback;
    }
}

function cleanCredentialDescriptors(descriptors: any) {
    if (Array.isArray(descriptors)) {
        for (const desc of descriptors) {
            if (desc) {
                // Remove null/undefined transports to prevent browser sequence conversion error
                if (desc.transports === null || desc.transports === undefined) {
                    delete desc.transports;
                }
            }
        }
    }
}

export async function getRegistrationOptions(): Promise<{ optionsJson: string }> {
    const response = await converter('/webauth/register/options', { method: 'GET' });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to fetch registration options'));
    }
    const data = await response.json();
    
    try {
        const parsed = JSON.parse(data.optionsJson);
        
        // Clean legacy U2F appid/appidExclude extensions
        if (parsed.extensions) {
            delete parsed.extensions.appidExclude;
            delete parsed.extensions.appid;
        }
        
        cleanCredentialDescriptors(parsed.excludeCredentials);
        cleanCredentialDescriptors(parsed.allowCredentials);
        
        data.optionsJson = JSON.stringify(parsed);
    } catch (e) {
        console.error('Error cleaning registration options:', e);
    }
    
    return data;
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
    const data = await response.json();
    
    try {
        const parsed = JSON.parse(data.optionsJson);
        const authOptions = parsed.publicKeyCredentialRequestOptions || parsed.publicKey || parsed;
        
        // Clean legacy U2F appid/appidExclude extensions
        if (authOptions.extensions) {
            delete authOptions.extensions.appidExclude;
            delete authOptions.extensions.appid;
        }
        
        cleanCredentialDescriptors(authOptions.allowCredentials);
        
        data.optionsJson = JSON.stringify(parsed);
    } catch (e) {
        console.error('Error cleaning assertion options:', e);
    }
    
    return data;
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
