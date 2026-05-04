import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ZipCodePoint } from '@/types';
import { formatNumber } from '@/lib/formatters';

interface StudentHeatMapProps {
  points: ZipCodePoint[];
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number; // miles
}

// Denver, CO as default center
const DEFAULT_CENTER: [number, number] = [39.7392, -104.9903];
const DEFAULT_ZOOM = 7;

/**
 * Size the circle marker based on student count.
 * Returns radius in meters.
 */
function getCircleRadius(count: number): number {
  // Scale: 1 student → 2000m, 50+ → 8000m
  return Math.min(2000 + count * 300, 12000);
}

function getCircleColor(count: number): string {
  if (count >= 20) return '#dc2626'; // red
  if (count >= 10) return '#7C8DB0'; // slate
  if (count >= 5) return '#eab308';  // yellow
  return '#3b82f6';                   // blue
}

/**
 * Component to fit map bounds to points
 */
function FitBounds({ points, searchCenter, searchRadius }: {
  points: ZipCodePoint[];
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (searchCenter && searchRadius) {
      // Zoom to search area — compute bounds from center + radius directly
      // to avoid needing a circle attached to the map
      const center = L.latLng(searchCenter.lat, searchCenter.lng);
      const radiusMeters = searchRadius * 1609.34;
      const bounds = center.toBounds(radiusMeters * 2);
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }, [map, points, searchCenter, searchRadius]);

  return null;
}

export function StudentHeatMap({ points, searchCenter, searchRadius }: StudentHeatMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Memoize to prevent unnecessary re-renders
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.count - b.count), // smaller circles on top
    [points]
  );

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds
          points={sortedPoints}
          searchCenter={searchCenter}
          searchRadius={searchRadius}
        />

        {/* Search radius circle */}
        {searchCenter && searchRadius && (
          <Circle
            center={[searchCenter.lat, searchCenter.lng]}
            radius={searchRadius * 1609.34}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '8 4'
            }}
          />
        )}

        {/* Student location circles */}
        {sortedPoints.map((point) => (
          <Circle
            key={point.zipCode}
            center={[point.lat, point.lng]}
            radius={getCircleRadius(point.count)}
            pathOptions={{
              color: getCircleColor(point.count),
              fillColor: getCircleColor(point.count),
              fillOpacity: 0.5,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Zip Code: {point.zipCode}</p>
                <p>{formatNumber(point.count)} student{point.count !== 1 ? 's' : ''}</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
