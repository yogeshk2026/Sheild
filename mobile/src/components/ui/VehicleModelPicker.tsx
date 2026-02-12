import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { Search, ChevronDown, Lock, X } from 'lucide-react-native';
import { Text } from './Text';
import { searchModels, VehicleModel } from '@/lib/vehicleData';

interface VehicleModelPickerProps {
  model: string;
  make: string;
  onModelChange: (model: string) => void;
  onMakeChange: (make: string) => void;
  required?: boolean;
  modelPlaceholder?: string;
  makePlaceholder?: string;
  getRequiredFieldBorderColor?: (value: string) => string;
}

export function VehicleModelPicker({
  model,
  make,
  onModelChange,
  onMakeChange,
  required = false,
  modelPlaceholder = 'Search Model',
  makePlaceholder = 'Make',
  getRequiredFieldBorderColor,
}: VehicleModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VehicleModel[]>([]);

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.length >= 1) {
      const results = searchModels(searchQuery);
      setSearchResults(results);
    } else {
      // Show popular models when no search
      setSearchResults(searchModels(''));
    }
  }, [searchQuery]);

  const getBorderColor = (value: string): string => {
    if (required && getRequiredFieldBorderColor) {
      return getRequiredFieldBorderColor(value);
    }
    return '#E5E7EB';
  };

  const handleSelectModel = (vehicle: VehicleModel) => {
    onModelChange(vehicle.model);
    onMakeChange(vehicle.make);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onModelChange('');
    onMakeChange('');
  };

  // Make is locked when model is selected
  const isMakeLocked = model && make;

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {/* Model Picker */}
      <View style={{ flex: 1.5 }}>
        <Pressable
          onPress={() => setIsOpen(true)}
          style={{
            height: 48,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: getBorderColor(model),
            borderRadius: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: model ? '#000000' : '#9CA3AF',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {model || (required ? `${modelPlaceholder} *` : modelPlaceholder)}
          </Text>
          <ChevronDown size={20} color="#9CA3AF" />
        </Pressable>
      </View>

      {/* Make (Auto-filled, locked) */}
      <View style={{ flex: 1 }}>
        <View style={{ position: 'relative' }}>
          <View
            style={{
              height: 48,
              backgroundColor: isMakeLocked ? '#F3F4F6' : '#FFFFFF',
              borderWidth: 1,
              borderColor: getBorderColor(make),
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingRight: isMakeLocked ? 40 : 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: isMakeLocked ? '#6B7280' : '#9CA3AF',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {make || (required ? `${makePlaceholder} *` : makePlaceholder)}
            </Text>
          </View>
          {isMakeLocked && (
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

      {/* Model Selection Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
              {'Select Vehicle Model'}
            </Text>
            <Pressable onPress={() => setIsOpen(false)} hitSlop={8}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          {/* Search Input */}
          <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 48,
              }}
            >
              <Search size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by model or make..."
                placeholderTextColor="#9CA3AF"
                autoFocus
                style={{
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 16,
                  color: '#000000',
                }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Results */}
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {searchResults.length > 0 ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
                {searchResults.map((vehicle, index) => (
                  <Pressable
                    key={`${vehicle.make}-${vehicle.model}-${index}`}
                    onPress={() => handleSelectModel(vehicle)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
                      borderRadius: 12,
                      marginBottom: 8,
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#000000' }}>
                        {vehicle.model}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>
                        {vehicle.make}
                      </Text>
                    </View>
                    {vehicle.years && vehicle.years.length > 0 && (
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {`${vehicle.years[0]}-${vehicle.years[vehicle.years.length - 1]}`}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
                  {`No vehicles found matching "${searchQuery}"`}
                </Text>
                <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                  {'Try searching for a different model or make'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Clear Selection Button (if model selected) */}
          {model && (
            <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <Pressable
                onPress={() => {
                  handleClear();
                  setIsOpen(false);
                }}
                style={{
                  height: 48,
                  backgroundColor: '#FEE2E2',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#DC2626' }}>
                  {'Clear Selection'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
