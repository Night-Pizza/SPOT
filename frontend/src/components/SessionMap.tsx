import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SessionMapProps {
    center: [number, number];
    radius: number;
}

export default function SessionMap({ center, radius }: SessionMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current).setView(center, 15);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.circle(center, {
            radius,
            color: '#5ec832',
            fillColor: '#5ec832',
            fillOpacity: 0.2,
        }).addTo(map);

        L.marker(center).addTo(map)
            .bindPopup('Session location')
            .openPopup();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [center, radius]);

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}