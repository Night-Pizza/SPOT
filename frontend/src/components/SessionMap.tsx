import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SessionMapProps {
    center: [number, number];
    radius: number;
    userLocation?: [number, number];
    onCenterChange?: (newCenter: [number, number]) => void;
}

export default function SessionMap({ center, radius, userLocation, onCenterChange }: SessionMapProps) {
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

        const marker = (onCenterChange ? L.marker(center, { draggable: true }) : L.marker(center))
            .addTo(map)
            .bindPopup(onCenterChange ? 'Drag marker or click map to change center' : 'Session location')
            .openPopup();

        if (onCenterChange && typeof marker.on === 'function') {
            marker.on('dragend', () => {
                const latLng = marker.getLatLng();
                onCenterChange([latLng.lat, latLng.lng]);
            });
        }

        if (onCenterChange && typeof map.on === 'function') {
            map.on('click', (e: L.LeafletMouseEvent) => {
                onCenterChange([e.latlng.lat, e.latlng.lng]);
            });
        }

        if (userLocation && typeof L.circleMarker === 'function') {
            const userMarker = L.circleMarker(userLocation, {
                radius: 8,
                fillColor: '#3388ff',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map).bindPopup('Your location');

            if (typeof L.featureGroup === 'function' && typeof map.fitBounds === 'function') {
                const group = L.featureGroup([
                    L.marker(center),
                    userMarker
                ]);
                map.fitBounds(group.getBounds().pad(0.2));
            }
        }

        // Persistent invalidation checks to avoid capricious rendering issues (e.g. grey tiles)
        const invalidateTimer = setTimeout(() => {
            if (mapInstanceRef.current && typeof mapInstanceRef.current.invalidateSize === 'function') {
                mapInstanceRef.current.invalidateSize();
            }
        }, 200);

        return () => {
            clearTimeout(invalidateTimer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [center, radius, userLocation, onCenterChange]);

    return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}