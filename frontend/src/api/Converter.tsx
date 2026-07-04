    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

        function getCookie(name: string): string | null {
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? decodeURIComponent(match[2]) : null;
        }

        async function refreshCsrfToken(): Promise<void> {
            const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Failed to refresh CSRF token');
            }
        }

        export async function converter(endpoint: string, options: RequestInit = {}): Promise<Response> {
            let token = getCookie('XSRF-TOKEN');

            if (!token) {
                await refreshCsrfToken();
                token = getCookie('XSRF-TOKEN');
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'XSRF-TOKEN': token || '',
                    ...(options.headers || {}),
                },
                credentials: 'include',
            });

            
            if (response.status === 403 && options.method !== undefined && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
                console.warn('CSRF token might be expired, attempting refresh and retry...');
                await refreshCsrfToken();
                const newToken = getCookie('XSRF-TOKEN');
            
                                return fetch(`${API_BASE_URL}${endpoint}`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'XSRF-TOKEN': newToken || '',
                        ...(options.headers || {}),
                    },
                    credentials: 'include',
                });
            }

            return response;
        }