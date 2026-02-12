import React, { useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Text } from './Text';
import { lookupZip } from '@/lib/zipLookup';

interface ZipCityStateProps {
  zip: string;
  city: string;
  state: string;
  onZipChange: (zip: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  required?: boolean;
  zipPlaceholder?: string;
  cityPlaceholder?: string;
  statePlaceholder?: string;
  getRequiredFieldBorderColor?: (value: string) => string;
}

export function ZipCityState({
  zip,
  city,
  state,
  onZipChange,
  onCityChange,
  onStateChange,
  required = false,
  zipPlaceholder = 'Zip Code',
  cityPlaceholder = 'City',
  statePlaceholder = 'State',
  getRequiredFieldBorderColor,
}: ZipCityStateProps) {
  // Auto-fill city and state when ZIP changes
  useEffect(() => {
    if (zip.length === 5) {
      const result = lookupZip(zip);
      if (result.valid) {
        onCityChange(result.city);
        onStateChange(result.state);
      }
    }
  }, [zip]);

  const getBorderColor = (value: string): string => {
    if (required && getRequiredFieldBorderColor) {
      return getRequiredFieldBorderColor(value);
    }
    return '#E5E7EB';
  };

  // Check if city/state are auto-filled (locked)
  const isLocked = zip.length === 5 && city && state;

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {/* ZIP Code - User enters this */}
      <View style={{ flex: 1 }}>
        <TextInput
          value={zip}
          onChangeText={(text) => {
            // Only allow digits, max 5
            const cleaned = text.replace(/\D/g, '').slice(0, 5);
            onZipChange(cleaned);
          }}
          placeholder={required ? `${zipPlaceholder} *` : zipPlaceholder}
          keyboardType="number-pad"
          maxLength={5}
          placeholderTextColor="#9CA3AF"
          style={{
            height: 48,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: getBorderColor(zip),
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            color: '#000000',
          }}
        />
      </View>

      {/* City - Auto-filled, read-only when locked */}
      <View style={{ flex: 1.5 }}>
        <View style={{ position: 'relative' }}>
          <TextInput
            value={city}
            onChangeText={onCityChange}
            placeholder={required ? `${cityPlaceholder} *` : cityPlaceholder}
            placeholderTextColor="#9CA3AF"
            editable={!isLocked}
            style={{
              height: 48,
              backgroundColor: isLocked ? '#F3F4F6' : '#FFFFFF',
              borderWidth: 1,
              borderColor: getBorderColor(city),
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingRight: isLocked ? 40 : 16,
              fontSize: 16,
              color: isLocked ? '#6B7280' : '#000000',
            }}
          />
          {isLocked && (
            <View
              style={{
                position: 'absolute',
                right: 12,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
            >
              <Lock size={16} color="#9CA3AF" />
            </View>
          )}
        </View>
      </View>

      {/* State - Auto-filled, read-only when locked */}
      <View style={{ flex: 0.8 }}>
        <View style={{ position: 'relative' }}>
          <TextInput
            value={state}
            onChangeText={onStateChange}
            placeholder={required ? `${statePlaceholder} *` : statePlaceholder}
            placeholderTextColor="#9CA3AF"
            editable={!isLocked}
            maxLength={2}
            autoCapitalize="characters"
            style={{
              height: 48,
              backgroundColor: isLocked ? '#F3F4F6' : '#FFFFFF',
              borderWidth: 1,
              borderColor: getBorderColor(state),
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingRight: isLocked ? 32 : 12,
              fontSize: 16,
              color: isLocked ? '#6B7280' : '#000000',
            }}
          />
          {isLocked && (
            <View
              style={{
                position: 'absolute',
                right: 8,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
            >
              <Lock size={14} color="#9CA3AF" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
