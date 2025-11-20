'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Court } from '@/types';

interface GoogleMapProps {
  courts?: Court[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onCourtClick?: (court: Court) => void;
  selectedCourtId?: string;
  showCurrentLocation?: boolean;
}

export function GoogleMap({
  courts = [],
  center,
  zoom = 13,
  height = '400px',
  onCourtClick,
  selectedCourtId,
  showCurrentLocation = false,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key not configured');
        setIsLoading(false);
        return;
      }

      if (!mapRef.current) return;

      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        const { Map } = await loader.importLibrary('maps');
        const { Marker } = await loader.importLibrary('marker');
        const { AdvancedMarkerElement } = await loader.importLibrary('marker');

        // Determine center
        let mapCenter: { lat: number; lng: number };
        if (center) {
          mapCenter = center;
        } else if (courts.length > 0) {
          // Center on first court
          const firstCourt = courts[0];
          mapCenter = {
            lat: firstCourt.location.coordinates[1],
            lng: firstCourt.location.coordinates[0],
          };
        } else {
          // Default to a central location (e.g., Florida)
          mapCenter = { lat: 27.7663, lng: -82.6404 };
        }

        // Create map
        const mapInstance = new Map(mapRef.current, {
          center: mapCenter,
          zoom,
          mapId: 'COURTMATE_MAP',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setMap(mapInstance);

        // Get user location if requested
        if (showCurrentLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              setUserLocation(location);
              
              // Add user location marker
              new Marker({
                map: mapInstance,
                position: location,
                title: 'Your Location',
              });
            },
            (error) => {
              console.warn('Failed to get user location:', error);
            }
          );
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load Google Maps:', err);
        setError(err.message || 'Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Update markers when courts change
  useEffect(() => {
    if (!map) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const updateMarkers = async () => {
      try {
            const loader = new Loader({
              apiKey,
              version: 'weekly',
              libraries: ['places', 'geometry'],
            });
            const { Marker } = await loader.importLibrary('marker');

        // Clear existing markers
        markers.forEach((marker) => marker.setMap(null));
        const newMarkers: any[] = [];

        // Add markers for each court
        courts.forEach((court) => {
          const position = {
            lat: court.location.coordinates[1],
            lng: court.location.coordinates[0],
          };

            const marker = new Marker({
              map,
              position,
              title: court.name,
            });

          // Add click listener
          marker.addListener('click', () => {
            if (onCourtClick) {
              onCourtClick(court);
            }
            // Pan to court
            map.panTo(position);
            map.setZoom(Math.max(map.getZoom() || zoom, 15));
          });

          newMarkers.push(marker);
        });

        setMarkers(newMarkers);

        // Fit bounds to show all courts
        if (courts.length > 0) {
          const bounds = new (window as any).google.maps.LatLngBounds();
          courts.forEach((court) => {
            bounds.extend({
              lat: court.location.coordinates[1],
              lng: court.location.coordinates[0],
            });
          });
          if (userLocation) {
            bounds.extend(userLocation);
          }
          map.fitBounds(bounds);
        }
      } catch (err) {
        console.error('Failed to update markers:', err);
      }
    };

    updateMarkers();
  }, [map, courts, selectedCourtId, onCourtClick, zoom, userLocation]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">Failed to load map</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-200">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: '100%' }} />
    </div>
  );
}

