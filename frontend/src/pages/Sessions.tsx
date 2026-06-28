import { useState } from 'react';
import AppShell from '../components/AppShell';
import GeolocationButton from '../components/GeolocationButton';
import { createSession } from '../api/Session';


export default function SessionsPage() {
    const [title, _setTitle] = useState('');
    const [password, _setPassword] = useState('');
    const [allowedRadius, _setAllowedRadius] = useState('');
    const [validationTypes, _setValidationTypes] = useState<string[]>([]);
    const [coords, setCoords] = useState<{ lat: number; long: number } | null>(null);

    const handleCreateSession = async () => {
        const sessionData = {
            title: title || "Default Session Name",
            password: password || "1234",
            latitude: coords?.lat ?? 0.0,
            longitude: coords?.long ?? 0.0,
            allowedRadius: parseInt(allowedRadius) || 100,
            validationTypes: validationTypes.length > 0 ? validationTypes : ["GPS"]
        };
        try {
            const response = await createSession(sessionData);
            console.log(response);
        } catch (error) {
            if (error instanceof Error) {
            console.error(`Failed to create session: ${error.message}`);
            } else {
            console.error("An unexpected error occurred");
            }
        };
    }

    return (
        <AppShell title="Sessions">
            <p>Sessions page</p>
            <GeolocationButton onLocationSuccess={(coords) => setCoords(coords)} />
            <button 
                onClick={handleCreateSession}
            >
                Create session
            </button>
        </AppShell>
    );
}