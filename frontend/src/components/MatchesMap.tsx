'use client';

import { useState, useMemo, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Match } from '@/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import Link from 'next/link';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/date-utils';

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

interface MatchesMapProps {
  matches: Match[];
  onMapLoad?: () => void;
  homeCourt?: {
    coordinates?: {
      coordinates: [number, number]; // [lng, lat]
    };
  } | null;
  currentUserId?: string;
  onCourtSelect?: (courtId: string) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '600px',
};

const defaultCenter = {
  lat: 30.3322, // Jacksonville, FL
  lng: -81.6557,
};

// Helper function to convert rating to skill level
const getSkillLevelFromRating = (rating: number | undefined): string => {
  if (rating === undefined || rating === null) return 'N/A';
  if (rating >= 0.5 && rating <= 3.0) return 'BEGINNER';
  if (rating > 3.0 && rating < 4.0) return 'INTERMEDIATE';
  if (rating >= 4.0 && rating <= 5.0) return 'ADVANCED';
  if (rating > 5.0) return 'PRO';
  return 'N/A';
};

// Helper function to format gender
const formatGender = (gender: string | undefined): string => {
  if (!gender) return 'N/A';
  return gender.toUpperCase();
};

export const MatchesMap = ({ matches, onMapLoad, homeCourt, currentUserId, onCourtSelect }: MatchesMapProps) => {
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Group matches by court, excluding user's own matches, cancelled matches, and completed matches
  // Note: Confirmed matches are already filtered by the parent component before being passed here
  const courtMatchesMap = useMemo(() => {
    const map = new Map<string, { court: any; matches: Match[] }>();
    
    matches.forEach((match) => {
      // Exclude cancelled matches (backend stores as lowercase 'cancelled')
      if (match.status?.toLowerCase() === 'cancelled') return;
      // Exclude completed matches
      if (match.status?.toLowerCase() === 'completed') return;
      // Exclude matches created by the current user
      if (currentUserId && match.creatorUserId === currentUserId) return;
      
      if (match.court && match.court.id) {
        const existing = map.get(match.court.id);
        if (existing) {
          existing.matches.push(match);
        } else {
          map.set(match.court.id, {
            court: match.court,
            matches: [match],
          });
        }
      }
    });
    
    return map;
  }, [matches, currentUserId]);

  // Calculate circle size based on match count (similar to Zillow/Airbnb)
  // Returns scale value for Google Maps marker icon
  const getCircleScale = (matchCount: number): number => {
    // Base size for 1 match, scales up logarithmically
    // Min: 20px (scale ~12), Max: 60px (scale ~35) for reasonable visual range
    const minScale = 12;
    const maxScale = 35;
    const minMatches = 1;
    const maxMatches = 50; // Cap at 50 matches for scaling
    
    if (matchCount <= minMatches) {
      return minScale;
    }
    
    // Logarithmic scaling for better visual distribution
    const normalized = Math.log(matchCount) / Math.log(maxMatches);
    const scale = minScale + (maxScale - minScale) * normalized;
    
    return Math.min(Math.max(scale, minScale), maxScale);
  };

  // Calculate font size for label based on match count
  const getLabelFontSize = (matchCount: number): string => {
    if (matchCount < 10) return '12px';
    if (matchCount < 100) return '13px';
    return '14px';
  };

  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Get center prioritizing: home court > geolocation > first match > default
  const center = useMemo(() => {
    // Priority 1: User's home court
    if (homeCourt?.coordinates?.coordinates) {
      const [lng, lat] = homeCourt.coordinates.coordinates;
      return { lat, lng };
    }
    
    // Priority 2: User's geolocation
    if (userLocation) {
      return userLocation;
    }
    
    // Priority 3: First match's court coordinates
    for (const [, { court }] of courtMatchesMap) {
      if (court.coordinates?.coordinates) {
        const [lng, lat] = court.coordinates.coordinates;
        return { lat, lng };
      }
    }
    
    // Priority 4: Default Jacksonville
    return defaultCenter;
  }, [homeCourt, userLocation, courtMatchesMap]);

  const onLoad = (map: google.maps.Map) => {
    setMap(map);
    
    // Fit bounds to show all markers
    if (courtMatchesMap.size > 0) {
      const bounds = new google.maps.LatLngBounds();
      courtMatchesMap.forEach(({ court }) => {
        if (court.coordinates?.coordinates) {
          const [lng, lat] = court.coordinates.coordinates;
          bounds.extend({ lat, lng });
        }
      });
      map.fitBounds(bounds);
      
      // Prevent too much zoom for single marker - cap at 13 for more zoomed out view
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 13) map.setZoom(13);
        google.maps.event.removeListener(listener);
      });
    }
    
    onMapLoad?.();
  };

  if (loadError) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <p className="font-medium mb-2">Map failed to load</p>
          <p className="text-sm">Please check your Google Maps API key configuration.</p>
        </div>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <p>Loading map...</p>
        </div>
      </Card>
    );
  }

  if (!googleMapsApiKey) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          <p className="font-medium mb-2">Map not available</p>
          <p className="text-sm">Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the map.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full h-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {Array.from(courtMatchesMap.entries()).map(([courtId, { court, matches }]) => {
          if (!court.coordinates?.coordinates) return null;
          
          const [lng, lat] = court.coordinates.coordinates;
          const matchCount = matches.length;
          const matchingMatches = matches.filter(m => (m as any).meetsCriteria !== false);
          const matchingCount = matchingMatches.length;
          // Show blue if at least one match meets criteria, grey only if ALL matches don't meet criteria
          const hasAtLeastOneMatching = matchingCount > 0;
          const circleScale = getCircleScale(matchCount);
          const labelFontSize = getLabelFontSize(matchCount);
          
          // Grey out marker only if ALL matches don't meet criteria
          const markerColor = hasAtLeastOneMatching ? '#2563eb' : '#6b7280'; // Blue if at least one matches, grey if none match
          const markerOpacity = hasAtLeastOneMatching ? 0.8 : 0.9; // More opaque for grey markers
          
          return (
            <Marker
              key={courtId}
              position={{ lat, lng }}
              onClick={() => setSelectedCourt(courtId)}
              label={{
                text: matchCount.toString(),
                color: 'white',
                fontSize: labelFontSize,
                fontWeight: 'bold',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: circleScale,
                fillColor: markerColor,
                fillOpacity: markerOpacity,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          );
        })}

        {selectedCourt && courtMatchesMap.has(selectedCourt) && (
          <InfoWindow
            position={(() => {
              const { court } = courtMatchesMap.get(selectedCourt)!;
              const [lng, lat] = court.coordinates.coordinates;
              return { lat, lng };
            })()}
            onCloseClick={() => setSelectedCourt(null)}
          >
            <div className="p-2 max-w-sm">
              <h3 className="font-semibold text-gray-900 mb-1">
                {courtMatchesMap.get(selectedCourt)!.court.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {courtMatchesMap.get(selectedCourt)!.court.address}
              </p>
              
              <div className="space-y-2 mb-3">
                <p className="text-sm font-medium text-gray-900">
                  {courtMatchesMap.get(selectedCourt)!.matches.length} {courtMatchesMap.get(selectedCourt)!.matches.length === 1 ? 'match' : 'matches'} available
                </p>
                
                {courtMatchesMap.get(selectedCourt)!.matches.slice(0, 3).map((match) => {
                  const meetsCriteria = (match as any).meetsCriteria !== false;
                  return (
                    <div 
                      key={match.id} 
                      className={`text-xs border-l-2 pl-2 ${
                        meetsCriteria 
                          ? 'text-gray-600 border-blue-500' 
                          : 'text-gray-400 border-gray-400 opacity-60'
                      }`}
                    >
                      <div className="font-medium">{format(parseLocalDate(match.date), 'MMM d, yyyy')}</div>
                      <div>{getSkillLevelFromRating(match.creator?.ratingValue)} • {formatGender(match.creator?.gender)}</div>
                    </div>
                  );
                })}
                
                {courtMatchesMap.get(selectedCourt)!.matches.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{courtMatchesMap.get(selectedCourt)!.matches.length - 3} more
                  </p>
                )}
              </div>
              
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  const courtId = courtMatchesMap.get(selectedCourt)!.court.id;
                  if (onCourtSelect) {
                    onCourtSelect(courtId);
                    setSelectedCourt(null); // Close the popup
                  }
                }}
              >
                View Matches
              </Button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

