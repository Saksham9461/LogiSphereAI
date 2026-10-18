import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle2, X } from 'lucide-react';
import { searchPlaces, getPlaceDetails } from '../services/organizationService';
import type { PlaceSuggestion } from '../types';

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onPlaceSelect: (details: {
    placeId: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  onClearPlace: () => void;
  selectedPlaceId?: string;
  selectedCoords?: { latitude: number; longitude: number } | null;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  onClearPlace,
  selectedPlaceId,
  selectedCoords,
  error,
  placeholder = 'Enter company address (e.g. Ring Road, Surat)',
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const sessionTokenRef = useRef<string>('session_token_default');
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize unique session token on mount
  useEffect(() => {
    sessionTokenRef.current = `token_${Date.now()}`;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced places search
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      const timer = setTimeout(() => {
        setSuggestions([]);
        setIsOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Do not search if the current value matches the already selected place address
    if (selectedPlaceId && selectedCoords) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(value, sessionTokenRef.current);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.warn('[PlaceAutocomplete] Autocomplete error:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, selectedPlaceId, selectedCoords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    // CRITICAL REQUIREMENT: Clear previous Place ID and coordinates whenever address is changed
    if (selectedPlaceId || selectedCoords) {
      onClearPlace();
    }
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsOpen(false);
    setIsLoading(true);

    try {
      const details = await getPlaceDetails(suggestion.placeId, sessionTokenRef.current);
      // Renew session token after place selection per Google Places billing best practices
      sessionTokenRef.current = Math.random().toString(36).substring(2, 15);

      const resolvedAddress = details?.formattedAddress || suggestion.address || suggestion.title;
      const latitude = details?.latitude ?? 0;
      const longitude = details?.longitude ?? 0;

      onChange(resolvedAddress);
      onPlaceSelect({
        placeId: suggestion.placeId,
        address: resolvedAddress,
        latitude,
        longitude,
      });
    } catch (err) {
      console.error('[PlaceAutocomplete] Failed to resolve place details:', err);
      // Fallback with suggestion title if details request fails
      const fallbackAddress = suggestion.address || suggestion.title;
      onChange(fallbackAddress);
      onPlaceSelect({
        placeId: suggestion.placeId,
        address: fallbackAddress,
        latitude: 0,
        longitude: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const chosen = suggestions[selectedIndex];
      if (chosen) handleSelectSuggestion(chosen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    onClearPlace();
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="reg-form-group" ref={containerRef}>
      <label className="reg-label" htmlFor="company-address-input">
        <span>
          Official Company Address <span className="reg-label-required">*</span>
        </span>
        <span className="reg-label-hint">Powered by Google Places</span>
      </label>

      <div className="reg-input-wrapper">
        <span className="reg-input-icon">
          {isLoading ? (
            <Loader2 size={18} className="spin" style={{ color: 'var(--color-amber)' }} />
          ) : (
            <MapPin size={18} />
          )}
        </span>

        <input
          id="company-address-input"
          type="text"
          className={`reg-input with-left-icon with-right-icon ${error ? 'error' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && !selectedPlaceId) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          role="combobox"
        />

        {value.length > 0 && !disabled && (
          <button
            type="button"
            className="reg-password-toggle"
            onClick={handleClear}
            aria-label="Clear address"
            title="Clear address input"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && <span className="reg-error-text">{error}</span>}

      {/* Verified Coordinates & Google Place ID Indicator */}
      {selectedPlaceId && selectedCoords && (
        <div className="coords-verified-badge">
          <CheckCircle2 size={14} color="#059669" />
          <span>
            Verified Coordinates: ({selectedCoords.latitude.toFixed(5)},{' '}
            {selectedCoords.longitude.toFixed(5)}) • Place ID: {selectedPlaceId.substring(0, 16)}…
          </span>
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <ul className="places-dropdown" role="listbox">
          {suggestions.map((item, index) => (
            <li
              key={item.placeId || index}
              className={`places-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectSuggestion(item)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <MapPin size={16} className="places-item-icon" />
              <div className="places-item-content">
                <span className="places-item-title">{item.title}</span>
                {item.secondaryText && (
                  <span className="places-item-subtitle">{item.secondaryText}</span>
                )}
              </div>
            </li>
          ))}
          {suggestions.length === 0 && !isLoading && value.length >= 2 && (
            <li className="places-empty">
              No matching locations found. You can enter the address manually.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
