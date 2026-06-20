const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface CreateSessionProps {
    title: string;
    password: string;
    latitude: number;
    longitude: number;
    allowedRadius: number;
    validationTypes: string[];
}


export async function createSession(data: CreateSessionProps) {
  const response = await fetch(`${API_BASE_URL}/session/create`, { // Скорректировал путь на /session/create
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Error creating session');
  return response.json();
}
    