const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

type QrTokenHandler = (token: string) => void;
type QrErrorHandler = (message: string) => void;

function getWebSocketUrl() {
    const baseUrl = API_BASE_URL.startsWith('http')
        ? new URL(API_BASE_URL)
        : new URL(API_BASE_URL, window.location.origin);

    baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/ws-spot/websocket`;
    baseUrl.search = '';
    baseUrl.hash = '';

    return baseUrl.toString();
}

function encodeStompFrame(command: string, headers: Record<string, string> = {}, body = '') {
    const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
    return `${command}\n${headerLines.join('\n')}\n\n${body}\0`;
}

function parseStompFrames(data: string) {
    return data
        .split('\0')
        .map((frame) => frame.trim())
        .filter(Boolean)
        .map((frame) => {
            const separatorIndex = frame.indexOf('\n\n');
            const headerPart = separatorIndex >= 0 ? frame.slice(0, separatorIndex) : frame;
            const body = separatorIndex >= 0 ? frame.slice(separatorIndex + 2) : '';
            const [command, ...headerLines] = headerPart.split('\n');
            const headers = headerLines.reduce<Record<string, string>>((acc, line) => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    acc[line.slice(0, colonIndex)] = line.slice(colonIndex + 1);
                }
                return acc;
            }, {});

            return { command, headers, body };
        });
}

export function subscribeToQrToken(
    sessionId: number,
    onToken: QrTokenHandler,
    onError: QrErrorHandler,
) {
    const socket = new WebSocket(getWebSocketUrl());
    let connected = false;

    socket.addEventListener('open', () => {
        socket.send(encodeStompFrame('CONNECT', {
            'accept-version': '1.2',
            host: window.location.host,
        }));
    });

    socket.addEventListener('message', (event) => {
        if (event.data === '\n') return;

        for (const frame of parseStompFrames(String(event.data))) {
            if (frame.command === 'CONNECTED' && !connected) {
                connected = true;
                socket.send(encodeStompFrame('SUBSCRIBE', {
                    id: `session-${sessionId}-qr`,
                    destination: `/topic/session/${sessionId}/qr`,
                    ack: 'auto',
                }));
            }

            if (frame.command === 'MESSAGE' && frame.body) {
                onToken(frame.body);
            }

            if (frame.command === 'ERROR') {
                onError(frame.body || 'Failed to receive QR token.');
            }
        }
    });

    socket.addEventListener('error', () => {
        onError('Failed to connect to QR token stream.');
    });

    return () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(encodeStompFrame('DISCONNECT'));
        }
        socket.close();
    };
}
