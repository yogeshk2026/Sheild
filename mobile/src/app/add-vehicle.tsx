import React, { useState, useMemo } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Car, Camera, X, AlertCircle, Sparkles, ImageIcon, ChevronDown } from 'lucide-react-native';
import { Button, Text, Card } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Vehicle } from '@/lib/types';
import { generateVehicleImage, getVehiclePlaceholderImage } from '@/lib/vehicle-image';
import {
  searchMakes,
  getModelsForMakeAndYear,
  getCorrectMakeName,
  getYearOptions,
  COMMON_COLORS,
} from '@/lib/vehicle-data';

type ImageSource = 'camera' | 'gallery' | 'ai_generated';

const MAX_VEHICLES = 2;

export default function AddVehicleScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle fields (reordered: Year, Color, Make, Model)
  const [carYear, setCarYear] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Dropdown states
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const currentVehicleCount = user?.vehicles?.length || 0;
  const canAddVehicle = currentVehicleCount < MAX_VEHICLES;

  // Get year options
  const yearOptions = useMemo(() => getYearOptions(), []);

  // Get make suggestions based on input
  const makeSuggestions = useMemo(() => {
    if (!carMake.trim()) return [];
    return searchMakes(carMake, 3);
  }, [carMake]);

  // Get available models based on year and make
  const availableModels = useMemo(() => {
    if (!carYear || !carMake) return [];
    const year = parseInt(carYear, 10);
    if (isNaN(year)) return [];
    return getModelsForMakeAndYear(carMake, year);
  }, [carYear, carMake]);

  // Handle make input change with auto-correction
  const handleMakeChange = (text: string) => {
    setCarMake(text);
    setCarModel('');
    setShowMakeSuggestions(text.length > 0);
  };

  // Select a make from suggestions
  const selectMake = (make: string) => {
    setCarMake(make);
    setCarModel('');
    setShowMakeSuggestions(false);
  };

  // Handle make input blur - auto-correct to valid make
  const handleMakeBlur = () => {
    setTimeout(() => {
      setShowMakeSuggestions(false);
      if (carMake.trim()) {
        const corrected = getCorrectMakeName(carMake);
        if (corrected) {
          setCarMake(corrected);
        }
      }
    }, 200);
  };

  // Select a year
  const selectYear = (year: number) => {
    setCarYear(year.toString());
    setShowYearDropdown(false);
    setCarModel('');
  };

  // Select a color
  const selectColor = (color: string) => {
    setCarColor(color);
    setShowColorDropdown(false);
  };

  // Select a model
  const selectModel = (model: string) => {
    setCarModel(model);
    setShowModelDropdown(false);
  };

  const isVehicleValid = Boolean(
    carMake.trim() &&
    carModel.trim() &&
    carYear.trim() &&
    carColor.trim() &&
    licensePlate.trim()
  );

  // Handle car photo upload
  const handlePickCarPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCarPhoto(result.assets[0].uri);
      setImageSource('gallery');
    }
  };

  const handleTakeCarPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCarPhoto(result.assets[0].uri);
      setImageSource('camera');
    }
  };

  const handleGenerateAIImage = async () => {
    if (!carMake.trim() || !carModel.trim() || !carYear.trim() || !carColor.trim()) {
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await generateVehicleImage({
        make: carMake.trim(),
        model: carModel.trim(),
        year: parseInt(carYear.trim(), 10),
        color: carColor.trim(),
      });

      if (result.success && result.imageUrl) {
        setCarPhoto(result.imageUrl);
        setImageSource('ai_generated');
      } else {
        const placeholder = getVehiclePlaceholderImage(carMake.trim());
        setCarPhoto(placeholder);
        setImageSource('ai_generated');
        console.log('[AddVehicle] AI generation failed, using placeholder:', result.error);
      }
    } catch (error) {
      const placeholder = getVehiclePlaceholderImage(carMake.trim());
      setCarPhoto(placeholder);
      setImageSource('ai_generated');
      console.log('[AddVehicle] AI generation error, using placeholder:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleClearPhoto = () => {
    setCarPhoto(null);
    setImageSource(null);
  };

  const handleSubmit = async () => {
    if (!isVehicleValid || !canAddVehicle) return;

    setIsSubmitting(true);

    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      make: carMake.trim(),
      model: carModel.trim(),
      year: parseInt(carYear.trim(), 10),
      color: carColor.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      isPrimary: false,
      addedAt: new Date().toISOString(),
      imageUrl: carPhoto || undefined,
      imageSource: imageSource || undefined,
    };

    const existingVehicles = user?.vehicles || [];
    updateUser({
      vehicles: [...existingVehicles, newVehicle],
    });

    setIsSubmitting(false);
    router.back();
  };

  // If user already has max vehicles, show limit reached
  if (!canAddVehicle) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Add Vehicle',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F8FAFC' },
          }}
        />

        <View className="flex-1 bg-shield-surface">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-20 h-20 rounded-full bg-amber-100 items-center justify-center mb-4">
                <AlertCircle size={40} color="#F59E0B" />
              </View>
              <Text className="text-shield-black text-xl font-bold text-center mb-2">
                Vehicle Limit Reached
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                You can only register up to {MAX_VEHICLES} vehicles. To add a new vehicle, please contact support to remove an existing one.
              </Text>
              <Button
                onPress={() => router.back()}
                pill
              >
                Go Back
              </Button>
            </View>
          </SafeAreaView>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Vehicle',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-shield-surface">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Car size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-shield-black text-lg font-bold">Additional Vehicle</Text>
                  <Text className="text-gray-500 text-sm">Register your second vehicle for coverage</Text>
                </View>
              </View>

              {/* Info notice */}
              <Card className="bg-amber-50 border border-amber-200 mb-4">
                <View className="flex-row items-start">
                  <AlertCircle size={18} color="#F59E0B" />
                  <View className="flex-1 ml-3">
                    <Text className="text-amber-800 font-semibold text-sm">Important</Text>
                    <Text className="text-amber-700 text-xs">
                      Once added, vehicle information is locked. To make changes, contact Courial Support.
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Vehicle form */}
              <Card>
                {/* Row 1: Year and Color */}
                <View className="flex-row mb-4">
                  {/* Year Dropdown */}
                  <View className="flex-1 mr-2" style={{ zIndex: 40 }}>
                    <Pressable
                      onPress={() => {
                        setShowYearDropdown(!showYearDropdown);
                        setShowColorDropdown(false);
                        setShowMakeSuggestions(false);
                        setShowModelDropdown(false);
                      }}
                      className="bg-gray-50 rounded-lg px-4 py-4 flex-row items-center justify-between"
                    >
                      <Text className={carYear ? 'text-black' : 'text-gray-400'}>
                        {carYear || 'Year'}
                      </Text>
                      <ChevronDown size={18} color="#9CA3AF" />
                    </Pressable>
                    {showYearDropdown && (
                      <View className="absolute top-14 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-hidden" style={{ zIndex: 100 }}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 192 }}>
                          {yearOptions.map((year) => (
                            <Pressable
                              key={year}
                              onPress={() => selectYear(year)}
                              className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                            >
                              <Text className="text-shield-black">{year}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Color Dropdown */}
                  <View className="flex-1 ml-2" style={{ zIndex: 40 }}>
                    <Pressable
                      onPress={() => {
                        setShowColorDropdown(!showColorDropdown);
                        setShowYearDropdown(false);
                        setShowMakeSuggestions(false);
                        setShowModelDropdown(false);
                      }}
                      className="bg-gray-50 rounded-lg px-4 py-4 flex-row items-center justify-between"
                    >
                      <Text className={carColor ? 'text-black' : 'text-gray-400'}>
                        {carColor || 'Color'}
                      </Text>
                      <ChevronDown size={18} color="#9CA3AF" />
                    </Pressable>
                    {showColorDropdown && (
                      <View className="absolute top-14 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-hidden" style={{ zIndex: 100 }}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 192 }}>
                          {COMMON_COLORS.map((color) => (
                            <Pressable
                              key={color}
                              onPress={() => selectColor(color)}
                              className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                            >
                              <Text className="text-shield-black">{color}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                {/* Make with autocomplete */}
                <View className="mb-4" style={{ zIndex: 30 }}>
                  <TextInput
                    value={carMake}
                    onChangeText={handleMakeChange}
                    onFocus={() => {
                      setShowMakeSuggestions(carMake.length > 0);
                      setShowYearDropdown(false);
                      setShowColorDropdown(false);
                      setShowModelDropdown(false);
                    }}
                    onBlur={handleMakeBlur}
                    placeholder="Car Make (e.g. Toyota)"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
                    style={{ color: '#000000' }}
                    autoCapitalize="words"
                  />
                  {showMakeSuggestions && makeSuggestions.length > 0 && (
                    <View className="absolute top-14 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" style={{ zIndex: 100 }}>
                      {makeSuggestions.map((make) => (
                        <Pressable
                          key={make}
                          onPress={() => selectMake(make)}
                          className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                        >
                          <Text className="text-shield-black">{make}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* Model - TextInput with dropdown suggestions */}
                <View className="mb-4" style={{ zIndex: 20 }}>
                  <View className="flex-row items-center">
                    <TextInput
                      value={carModel}
                      onChangeText={(text) => setCarModel(text)}
                      onFocus={() => {
                        if (availableModels.length > 0) {
                          setShowModelDropdown(true);
                        }
                        setShowYearDropdown(false);
                        setShowColorDropdown(false);
                        setShowMakeSuggestions(false);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowModelDropdown(false), 200);
                      }}
                      placeholder={availableModels.length === 0 ? "Enter Model (e.g. Camry)" : "Select or type Model"}
                      placeholderTextColor="#9CA3AF"
                      className="flex-1 bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
                      style={{ color: '#000000' }}
                      autoCapitalize="words"
                    />
                    {availableModels.length > 0 && (
                      <Pressable
                        onPress={() => {
                          setShowModelDropdown(!showModelDropdown);
                          setShowYearDropdown(false);
                          setShowColorDropdown(false);
                          setShowMakeSuggestions(false);
                        }}
                        className="absolute right-3"
                      >
                        <ChevronDown size={18} color="#9CA3AF" />
                      </Pressable>
                    )}
                  </View>
                  {showModelDropdown && availableModels.length > 0 && (
                    <View className="absolute top-14 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-hidden" style={{ zIndex: 100 }}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 192 }}>
                        {availableModels
                          .filter((model) => !carModel || model.toLowerCase().includes(carModel.toLowerCase()))
                          .map((model) => (
                          <Pressable
                            key={model}
                            onPress={() => selectModel(model)}
                            className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                          >
                            <Text className="text-shield-black">{model}</Text>
                          </Pressable>
                        ))}
                        {carModel && !availableModels.some((m) => m.toLowerCase() === carModel.toLowerCase()) && (
                          <View className="px-4 py-3 bg-blue-50">
                            <Text className="text-blue-700 text-sm">Using custom model: "{carModel}"</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View>
                  <TextInput
                    value={licensePlate}
                    onChangeText={(text) => setLicensePlate(text)}
                    placeholder="License Plate Number"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
                    style={{ color: '#000000' }}
                    autoCapitalize="characters"
                    onFocus={() => {
                      setShowYearDropdown(false);
                      setShowColorDropdown(false);
                      setShowMakeSuggestions(false);
                      setShowModelDropdown(false);
                    }}
                  />
                </View>
              </Card>

              {/* Car Photo Upload */}
              <View className="mt-4">
                <Text className="text-gray-600 text-sm mb-2">Vehicle Photo</Text>
                {carPhoto ? (
                  <View className="relative overflow-hidden" style={{ borderRadius: 12 }}>
                    <Image
                      source={{ uri: carPhoto }}
                      style={{ width: '100%', height: 180 }}
                      contentFit="cover"
                    />
                    {imageSource && (
                      <View className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 flex-row items-center">
                        {imageSource === 'camera' && <Camera size={12} color="#FFFFFF" />}
                        {imageSource === 'gallery' && <ImageIcon size={12} color="#FFFFFF" />}
                        {imageSource === 'ai_generated' && <Sparkles size={12} color="#FFFFFF" />}
                        <Text className="text-white text-xs ml-1">
                          {imageSource === 'camera' ? 'Camera' : imageSource === 'gallery' ? 'Gallery' : 'AI Generated'}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={handleClearPhoto}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                    >
                      <X size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row mb-2">
                      <Pressable
                        onPress={handleTakeCarPhoto}
                        className="flex-1 mr-2 bg-gray-50 rounded-xl py-5 items-center border-2 border-dashed border-gray-200 active:bg-gray-100"
                      >
                        <Camera size={26} color="#F97316" />
                        <Text className="text-gray-700 text-sm font-medium mt-2">Take Photo</Text>
                      </Pressable>
                      <Pressable
                        onPress={handlePickCarPhoto}
                        className="flex-1 ml-2 bg-gray-50 rounded-xl py-5 items-center border-2 border-dashed border-gray-200 active:bg-gray-100"
                      >
                        <ImageIcon size={26} color="#3B82F6" />
                        <Text className="text-gray-700 text-sm font-medium mt-2">Choose Photo</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleGenerateAIImage}
                      disabled={isGeneratingAI || !carMake.trim() || !carModel.trim() || !carYear.trim() || !carColor.trim()}
                      className={`bg-gradient-to-r rounded-xl py-5 items-center border-2 border-dashed ${
                        isGeneratingAI || !carMake.trim() || !carModel.trim() || !carYear.trim() || !carColor.trim()
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-purple-300 bg-purple-50'
                      } active:opacity-80`}
                    >
                      {isGeneratingAI ? (
                        <View className="flex-row items-center">
                          <ActivityIndicator size="small" color="#9333EA" />
                          <Text className="text-purple-700 text-sm font-medium ml-2">Generating...</Text>
                        </View>
                      ) : (
                        <>
                          <Sparkles size={26} color={carMake.trim() && carModel.trim() && carYear.trim() && carColor.trim() ? '#9333EA' : '#9CA3AF'} />
                          <Text className={`text-sm font-medium mt-2 ${
                            carMake.trim() && carModel.trim() && carYear.trim() && carColor.trim()
                              ? 'text-purple-700'
                              : 'text-gray-400'
                          }`}>
                            AI Generate Image
                          </Text>
                          {(!carMake.trim() || !carModel.trim() || !carYear.trim() || !carColor.trim()) && (
                            <Text className="text-gray-400 text-xs mt-1">Fill in vehicle details first</Text>
                          )}
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
                <Text className="text-gray-400 text-xs mt-2">Optional: Add a photo of your vehicle for display purposes</Text>
              </View>

              {/* Submit Button */}
              <View className="mt-6">
                <Button
                  onPress={handleSubmit}
                  disabled={!isVehicleValid || isSubmitting}
                  className="py-5"
                  pill
                  fullWidth
                >
                  <Text className="text-white font-bold text-lg">
                    {isSubmitting ? 'Adding Vehicle...' : 'Add & Lock Vehicle'}
                  </Text>
                </Button>
              </View>

              {/* Cancel Button */}
              <View className="mt-3">
                <Button
                  onPress={() => router.back()}
                  variant="secondary"
                  pill
                  fullWidth
                >
                  Cancel
                </Button>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
