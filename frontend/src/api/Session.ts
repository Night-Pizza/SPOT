import { converter } from './Converter';

interface CreateSessionProps {
    title: string;
    password: string;
    latitude: number;
    longitude: number;
    allowedRadius: number;
    validationTypes: string[];
}


export async function createSession(data: CreateSessionProps) {
  const response = await converter(`/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Error creating session');
  return response.json();
}
    