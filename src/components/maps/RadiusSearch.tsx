import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import type { ZipCodePoint } from '@/types';

interface RadiusSearchProps {
  allPoints: ZipCodePoint[];
  onFilteredPoints: (points: ZipCodePoint[]) => void;
  onSearchCenter: (center: { lat: number; lng: number } | null) => void;
  onSearchRadius: (radius: number | undefined) => void;
}

const RADIUS_OPTIONS = [
  { value: '5', label: '5 miles' },
  { value: '10', label: '10 miles' },
  { value: '15', label: '15 miles' },
  { value: '25', label: '25 miles' },
  { value: '50', label: '50 miles' },
  { value: '100', label: '100 miles' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Haversine distance between two lat/lng points in miles
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function RadiusSearch({
  allPoints,
  onFilteredPoints,
  onSearchCenter,
  onSearchRadius
}: RadiusSearchProps) {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('25');
  const [customRadius, setCustomRadius] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isActive, setIsActive] = useState(false);

  const effectiveRadius = radius === 'custom' ? customRadius : radius;

  const handleSearch = useCallback(async () => {
    if (!address.trim()) return;
    const radiusMiles = parseInt(effectiveRadius);
    if (!radiusMiles || radiusMiles <= 0) {
      setError('Enter a valid radius.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Geocode using Nominatim (free OSM API)
      const query = encodeURIComponent(address.trim() + ', Colorado');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'CHE-KPI-Analytics/1.0' } }
      );

      if (!res.ok) throw new Error('Geocoding request failed');

      const results = await res.json();
      if (!results || results.length === 0) {
        setError('Address not found. Try a different search.');
        return;
      }

      const { lat, lon } = results[0];
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lon);

      // Filter points within radius using Haversine
      const filtered = allPoints.filter(point =>
        haversineDistance(centerLat, centerLng, point.lat, point.lng) <= radiusMiles
      );

      onSearchCenter({ lat: centerLat, lng: centerLng });
      onSearchRadius(radiusMiles);
      onFilteredPoints(filtered);
      setIsActive(true);
    } catch (err) {
      setError('Failed to geocode address. Please try again.');
      console.error('Geocoding error:', err);
    } finally {
      setLoading(false);
    }
  }, [address, effectiveRadius, allPoints, onFilteredPoints, onSearchCenter, onSearchRadius]);

  const handleClear = useCallback(() => {
    setAddress('');
    setError('');
    setIsActive(false);
    onSearchCenter(null);
    onSearchRadius(undefined);
    onFilteredPoints(allPoints);
  }, [allPoints, onFilteredPoints, onSearchCenter, onSearchRadius]);

  const totalStudents = allPoints.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="space-y-2">
      <Input
        placeholder="Address or city..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        className="h-8 text-sm"
      />
      <Select value={radius} onValueChange={setRadius}>
        <SelectTrigger className="h-8 text-sm w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RADIUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {radius === 'custom' && (
        <Input
          type="number"
          placeholder="Miles..."
          value={customRadius}
          onChange={(e) => setCustomRadius(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-8 text-sm"
          min={1}
        />
      )}
      <div className="flex gap-2">
        <Button
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="flex-1 h-8 text-sm"
          size="sm"
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          {loading ? 'Searching...' : 'Search'}
        </Button>
        {isActive && (
          <Button onClick={handleClear} variant="outline" size="sm" className="h-8 text-sm">
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {isActive
          ? `Showing zip codes within ${effectiveRadius} miles`
          : `${allPoints.length} zip codes, ${totalStudents} students total`
        }
      </p>
    </div>
  );
}
