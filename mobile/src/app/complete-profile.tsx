import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { User, Car, MapPin, Check, AlertCircle, Camera, X, Sparkles, ImageIcon, ChevronDown, Lock, CreditCard } from 'lucide-react-native';
import { Button, Text, Card, DatePicker } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { UserAddress, Vehicle } from '@/lib/types';
import { generateVehicleImage, getVehiclePlaceholderImage } from '@/lib/vehicle-image';
import {
  searchMakes,
  getModelsForMakeAndYear,
  getCorrectMakeName,
  getYearOptions,
  COMMON_COLORS,
} from '@/lib/vehicle-data';
import { normalizeDate } from '@/lib/ticketScanning';

type Step = 'identity' | 'vehicle' | 'review';
type ImageSource = 'camera' | 'gallery' | 'ai_generated';

const startOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const parseDisplayDate = (value?: string | null): Date | null => {
  if (!value?.trim()) return null;

  const normalized = normalizeDate(value);
  if (!normalized) return null;

  const [month, day, year] = normalized.split('/');
  if (!month || !day || !year) return null;

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
};

const parseStoredDate = (value?: string | null): Date | null => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return null;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(parsed.getTime())) return null;
    return startOfDay(parsed);
  }

  return parseDisplayDate(value);
};

const formatDateForDisplay = (value: Date | null): string => {
  if (!value) return '';
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const year = String(value.getFullYear());
  return `${month}/${day}/${year}`;
};

const toIsoDate = (value: Date | null): string | null => {
  if (!value) return null;
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isFutureDate = (value: Date | null): boolean => {
  if (!value) return false;
  return startOfDay(value).getTime() > startOfDay(new Date()).getTime();
};

const isAtLeast18 = (value: Date | null): boolean => {
  if (!value) return false;
  const today = startOfDay(new Date());
  const adultCutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return startOfDay(value).getTime() <= adultCutoff.getTime();
};

export default function CompleteProfileScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const [currentStep, setCurrentStep] = useState<Step>(user?.profileStep || 'identity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identity fields
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(user?.address?.street || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [state, setState] = useState(user?.address?.state || '');
  const [zipCode, setZipCode] = useState(user?.address?.zipCode || '');

  // Additional identity fields (new)
  const [driversLicenseNumber, setDriversLicenseNumber] = useState(user?.driversLicenseNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(() => {
    const parsedDate = parseStoredDate(user?.dateOfBirth);
    return parsedDate ? formatDateForDisplay(parsedDate) : null;
  });
  const [vin, setVin] = useState(user?.vin || '');

  // Vehicle fields
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

  // ZIP lookup state
  const [isLoadingZip, setIsLoadingZip] = useState(false);

  // Custom model entry state
  const [isCustomModel, setIsCustomModel] = useState(false);

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
    setCarModel(''); // Reset model when make changes
    setShowMakeSuggestions(text.length > 0);
  };

  // Select a make from suggestions
  const selectMake = (make: string) => {
    setCarMake(make);
    setCarModel(''); // Reset model when make changes
    setIsCustomModel(false);
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
    // Reset model if year changes (model availability may differ)
    setCarModel('');
    setIsCustomModel(false);
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
    // Require vehicle details to generate
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
        // Use placeholder as fallback
        const placeholder = getVehiclePlaceholderImage(carMake.trim());
        setCarPhoto(placeholder);
        setImageSource('ai_generated');
        console.log('[CompleteProfile] AI generation failed, using placeholder:', result.error);
      }
    } catch (error) {
      // Use placeholder on error
      const placeholder = getVehiclePlaceholderImage(carMake.trim());
      setCarPhoto(placeholder);
      setImageSource('ai_generated');
      console.log('[CompleteProfile] AI generation error, using placeholder:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleClearPhoto = () => {
    setCarPhoto(null);
    setImageSource(null);
  };

  // Lookup city/state from ZIP code using Zippopotam.us API (free, no key)
  const lookupZipCode = useCallback(async (zip: string) => {
    if (zip.length !== 5) return;

    setIsLoadingZip(true);
    try {
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (response.ok) {
        const data = await response.json();
        if (data.places && data.places.length > 0) {
          const place = data.places[0];
          setCity(place['place name'] || '');
          setState(place['state abbreviation'] || '');
        }
      }
    } catch (error) {
      console.log('ZIP lookup error:', error);
    } finally {
      setIsLoadingZip(false);
    }
  }, []);

  // Handle ZIP code change - auto lookup city/state
  const handleZipChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 5);
    setZipCode(digits);
    if (digits.length === 5) {
      lookupZipCode(digits);
    }
  };

  // VIN validation helper (standard VIN is 17 characters)
  const isValidVin = (vinStr: string): boolean => {
    const trimmed = vinStr.trim().toUpperCase();
    // VIN must be exactly 17 alphanumeric characters (no I, O, Q)
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(trimmed);
  };

  const isValidDriversLicense = (license: string): boolean => {
    const normalizedLicense = license.trim().toUpperCase();
    return /^[A-Z0-9]{5,20}$/.test(normalizedLicense);
  };

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const maxDobDate = useMemo(() => {
    const today = startOfDay(new Date());
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  }, []);

  const parsedDateOfBirth = useMemo(() => parseDisplayDate(dateOfBirth), [dateOfBirth]);
  const hasValidDob = !dateOfBirth || (!!parsedDateOfBirth && !isFutureDate(parsedDateOfBirth) && isAtLeast18(parsedDateOfBirth));

  const isIdentityValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    phone.trim() &&
    phone.replace(/\D/g, '').length === 10 &&
    street.trim() &&
    city.trim() &&
    state.trim() &&
    zipCode.trim() &&
    driversLicenseNumber.trim() &&
    isValidDriversLicense(driversLicenseNumber) &&
    hasValidDob &&
    vin.trim() &&
    isValidVin(vin)
  );

  const isVehicleValid = Boolean(
    carMake.trim() &&
    carModel.trim() &&
    carYear.trim() &&
    carColor.trim() &&
    licensePlate.trim()
  );

  const handleNextStep = () => {
    if (currentStep === 'identity' && isIdentityValid) {
      updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zipCode: zipCode.trim(),
        },
        driversLicenseNumber: driversLicenseNumber.trim().toUpperCase(),
        dateOfBirth: toIsoDate(parsedDateOfBirth) || null,
        vin: vin.trim().toUpperCase(),
        profileStep: 'vehicle',
      });
      setCurrentStep('vehicle');
    } else if (currentStep === 'vehicle' && isVehicleValid) {
      updateUser({ profileStep: 'review' });
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'vehicle') {
      updateUser({ profileStep: 'identity' });
      setCurrentStep('identity');
    } else if (currentStep === 'review') {
      updateUser({ profileStep: 'vehicle' });
      setCurrentStep('vehicle');
    }
  };

  const handleSubmit = async () => {
    if (!isIdentityValid || !isVehicleValid) return;

    setIsSubmitting(true);

    const address: UserAddress = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zipCode: zipCode.trim(),
    };

    const vehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      make: carMake.trim(),
      model: carModel.trim(),
      year: parseInt(carYear.trim(), 10),
      color: carColor.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      isPrimary: true,
      addedAt: new Date().toISOString(),
      imageUrl: carPhoto || undefined,
      imageSource: imageSource || undefined,
    };

    const isoDob = toIsoDate(parsedDateOfBirth) || null;

    // Update user with all the new info including additional identity fields
    updateUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      phone: formatPhone(phone),
      address,
      driversLicenseNumber: driversLicenseNumber.trim().toUpperCase(),
      dateOfBirth: isoDob,
      vin: vin.trim().toUpperCase(),
      vehicles: [vehicle],
      profileCompleted: true,
      profileLockedAt: new Date().toISOString(),
      profileStep: undefined,
    });

    setIsSubmitting(false);
    router.back();
  };

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center mb-6 px-4">
      {(['identity', 'vehicle', 'review'] as Step[]).map((step, index) => {
        const isActive = currentStep === step;
        const isCompleted =
          (step === 'identity' && (currentStep === 'vehicle' || currentStep === 'review')) ||
          (step === 'vehicle' && currentStep === 'review');

        return (
          <React.Fragment key={step}>
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                isActive ? 'bg-shield-accent' : isCompleted ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              {isCompleted ? (
                <Check size={16} color="#FFFFFF" />
              ) : (
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {index + 1}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderIdentityStep = () => (
    <View>
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
          <User size={20} color="#F97316" />
        </View>
        <View>
          <Text className="text-shield-black text-lg font-bold">Legal Identity</Text>
          <Text className="text-gray-500 text-sm">As shown on your driver's license</Text>
        </View>
      </View>

      <Card className="mb-4">
        {/* First and Last Name on same row */}
        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <TextInput
              value={firstName}
              onChangeText={(text) => setFirstName(text)}
              placeholder="First Name"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
              style={{ color: '#000000' }}
              autoCapitalize="words"
            />
          </View>
          <View className="flex-1 ml-2">
            <TextInput
              value={lastName}
              onChangeText={(text) => setLastName(text)}
              placeholder="Last Name"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
              style={{ color: '#000000' }}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View>
          <View className="relative">
            <TextInput
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              placeholder="Phone Number (111) 111-1111"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-100 rounded-lg px-4 py-4 pr-12 text-shield-black text-base"
              style={{ color: user?.phoneVerified ? '#666666' : '#000000' }}
              keyboardType="phone-pad"
              maxLength={14}
              editable={!user?.phoneVerified}
            />
            <View className="absolute right-4 top-4">
              <Lock size={18} color="#9CA3AF" />
            </View>
          </View>
          {/* Phone verified indicator */}
          {user?.phoneVerified && (
            <View className="flex-row items-center mt-2">
              <Check size={16} color="#22C55E" />
              <Text className="text-green-600 text-sm ml-1 font-medium">Phone verified</Text>
            </View>
          )}
          <Text className="text-gray-400 text-xs mt-1">
            {user?.phoneVerified
              ? 'Phone number cannot be changed after verification. Contact support if needed.'
              : 'Enter your phone number in (XXX) XXX-XXXX format.'}
          </Text>
        </View>
      </Card>

      <View className="flex-row items-center mb-4 mt-6">
        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
          <MapPin size={20} color="#3B82F6" />
        </View>
        <View>
          <Text className="text-shield-black text-lg font-bold">Address</Text>
          <Text className="text-gray-500 text-sm">Enter ZIP code first to auto-fill city & state</Text>
        </View>
      </View>

      <View style={{ overflow: 'visible', zIndex: 100 }}>
      <Card>
        {/* ZIP, City, State on same row */}
        <View className="flex-row mb-4">
          <View className="w-20 mr-2">
            <TextInput
              value={zipCode}
              onChangeText={handleZipChange}
              placeholder="ZIP"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 rounded-lg px-3 py-4 text-shield-black text-base text-center"
              style={{ color: '#000000' }}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View className="flex-1 mr-2">
            <TextInput
              value={city}
              onChangeText={(text) => setCity(text)}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
              className={`bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base ${city ? 'bg-green-50' : ''}`}
              style={{ color: '#000000' }}
              autoCapitalize="words"
            />
          </View>
          <View className="w-16">
            <TextInput
              value={state}
              onChangeText={(text) => setState(text)}
              placeholder="ST"
              placeholderTextColor="#9CA3AF"
              className={`bg-gray-50 rounded-lg px-3 py-4 text-shield-black text-base text-center ${state ? 'bg-green-50' : ''}`}
              style={{ color: '#000000' }}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>
        {isLoadingZip && (
          <Text className="text-gray-400 text-xs mb-2 ml-1">Looking up location...</Text>
        )}

        {/* Street Address - simple input */}
        <View>
          <TextInput
            value={street}
            onChangeText={(text) => setStreet(text)}
            placeholder="Street Address"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
            style={{ color: '#000000' }}
            autoCapitalize="words"
          />
        </View>
      </Card>
      </View>

      {/* Driver's License & Identification Section */}
      <View className="flex-row items-center mb-4 mt-6">
        <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
          <CreditCard size={20} color="#9333EA" />
        </View>
        <View>
          <Text className="text-shield-black text-lg font-bold">Identification</Text>
          <Text className="text-gray-500 text-sm">Required for claim verification</Text>
        </View>
      </View>

      <Card className="mb-4">
        {/* Driver's License Number */}
        <View className="mb-4">
          <TextInput
            value={driversLicenseNumber}
            onChangeText={(text) => setDriversLicenseNumber(text.toUpperCase())}
            placeholder="Driver's License Number *"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
            style={{ color: '#000000' }}
            autoCapitalize="characters"
          />
          {driversLicenseNumber.length > 0 && !isValidDriversLicense(driversLicenseNumber) && (
            <Text className="text-red-500 text-xs mt-1">
              Driver&apos;s license must be 5-20 letters/numbers.
            </Text>
          )}
        </View>

        {/* Date of Birth */}
        <View className="mb-4">
          <DatePicker
            value={dateOfBirth || ''}
            onChange={(value) => setDateOfBirth(value.trim() ? value : null)}
            placeholder="Date of Birth (optional)"
            maximumDate={maxDobDate}
          />
          {!!parsedDateOfBirth && isFutureDate(parsedDateOfBirth) && (
            <Text className="text-red-500 text-xs mt-1">
              Date of birth cannot be in the future.
            </Text>
          )}
          {!!parsedDateOfBirth && !isFutureDate(parsedDateOfBirth) && !isAtLeast18(parsedDateOfBirth) && (
            <Text className="text-red-500 text-xs mt-1">
              You must be at least 18 years old.
            </Text>
          )}
        </View>

        {/* VIN */}
        <View>
          <TextInput
            value={vin}
            onChangeText={(text) => setVin(text.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17))}
            placeholder="VIN (17 characters) *"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
            style={{ color: '#000000' }}
            autoCapitalize="characters"
            maxLength={17}
          />
          {vin.length > 0 && vin.length !== 17 && (
            <Text className="text-orange-500 text-xs mt-1">
              VIN must be exactly 17 characters ({vin.length}/17)
            </Text>
          )}
          {vin.length === 17 && !isValidVin(vin) && (
            <Text className="text-red-500 text-xs mt-1">
              Invalid VIN format
            </Text>
          )}
          {vin.length === 17 && isValidVin(vin) && (
            <View className="flex-row items-center mt-1">
              <Check size={14} color="#22C55E" />
              <Text className="text-green-600 text-xs ml-1">Valid VIN</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Continue Button - inline after address */}
      <View className="mt-6">
        <Button
          onPress={handleNextStep}
          disabled={!isIdentityValid}
          className="py-5"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </Button>
      </View>

      {/* Back Button */}
      <View className="mt-3">
        <Button
          onPress={() => router.back()}
          variant="secondary"
          className="py-5 bg-black"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">Back</Text>
        </Button>
      </View>
    </View>
  );

  const renderVehicleStep = () => (
    <View>
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
          <Car size={20} color="#22C55E" />
        </View>
        <View>
          <Text className="text-shield-black text-lg font-bold">Primary Vehicle</Text>
          <Text className="text-gray-500 text-sm">The vehicle you use for gig work</Text>
        </View>
      </View>

      <Card>
        {/* Row 1: Year and Color (these inform Make/Model suggestions) */}
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

        {/* Make with autocomplete suggestions */}
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

        {/* Model - Dropdown or custom entry */}
        <View className="mb-4" style={{ zIndex: 20 }}>
          {isCustomModel ? (
            <View>
              <View className="flex-row items-center">
                <TextInput
                  value={carModel}
                  onChangeText={(text) => setCarModel(text)}
                  placeholder="Enter Model Name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 bg-gray-50 rounded-lg px-4 py-4 text-shield-black text-base"
                  style={{ color: '#000000' }}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
              <Pressable
                onPress={() => {
                  setIsCustomModel(false);
                  setCarModel('');
                }}
                className="mt-2"
              >
                <Text className="text-blue-600 text-sm">← Back to model list</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  if (availableModels.length > 0) {
                    setShowModelDropdown(!showModelDropdown);
                    setShowYearDropdown(false);
                    setShowColorDropdown(false);
                    setShowMakeSuggestions(false);
                  } else if (carMake && carYear) {
                    // No models available, allow custom entry
                    setIsCustomModel(true);
                  }
                }}
                className="bg-gray-50 rounded-lg px-4 py-4 flex-row items-center justify-between"
              >
                <Text className={carModel ? 'text-black' : 'text-gray-400'}>
                  {carModel || (!carMake || !carYear ? 'Select Make & Year first' : 'Select Model')}
                </Text>
                <ChevronDown size={18} color="#9CA3AF" />
              </Pressable>
              {showModelDropdown && availableModels.length > 0 && (
                <View className="absolute top-14 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-hidden" style={{ zIndex: 100 }}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 192 }}>
                    {availableModels.map((model) => (
                      <Pressable
                        key={model}
                        onPress={() => selectModel(model)}
                        className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                      >
                        <Text className="text-shield-black">{model}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => {
                        setShowModelDropdown(false);
                        setIsCustomModel(true);
                        setCarModel('');
                      }}
                      className="px-4 py-3 bg-gray-50"
                    >
                      <Text className="text-blue-600">Other / Not Listed</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}
            </>
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
          <View className="relative overflow-hidden bg-gray-200" style={{ borderRadius: 12 }}>
            <Image
              source={{ uri: carPhoto }}
              style={{ width: '100%', height: 180 }}
              contentFit="cover"
              onError={(e) => console.log('[Image] Load error:', e.error)}
            />
            {/* Image source badge */}
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
            {/* Three image option buttons */}
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

            {/* AI Generate button - full width */}
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

      {/* Continue Button - inline after vehicle photo */}
      <View className="mt-6">
        <Button
          onPress={handleNextStep}
          disabled={!isVehicleValid}
          className="py-5"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </Button>
      </View>

      {/* Back Button */}
      <View className="mt-3">
        <Button
          onPress={handleBack}
          variant="secondary"
          className="py-5 bg-black"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">Back</Text>
        </Button>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View>
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
          <Check size={20} color="#9333EA" />
        </View>
        <View>
          <Text className="text-shield-black text-lg font-bold">Review Information</Text>
          <Text className="text-gray-500 text-sm">Please verify all details are correct</Text>
        </View>
      </View>

      <Card className="bg-amber-50 border border-amber-200 mb-4">
        <View className="flex-row items-start">
          <AlertCircle size={20} color="#F59E0B" />
          <View className="flex-1 ml-3">
            <Text className="text-amber-800 font-semibold mb-1">Important</Text>
            <Text className="text-amber-700 text-sm">
              Once submitted, this information cannot be changed without contacting Courial Support.
              Please ensure all details are accurate.
            </Text>
          </View>
        </View>
      </Card>

      <Card className="mb-4">
        <Text className="text-shield-black font-semibold mb-3">Legal Identity</Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Name</Text>
            <Text className="text-shield-black font-medium">{`${firstName} ${lastName}`}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Phone</Text>
            <Text className="text-shield-black font-medium">{phone}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Address</Text>
            <Text className="text-shield-black font-medium text-right flex-1 ml-4">
              {`${street}, ${city}, ${state} ${zipCode}`}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Driver's License</Text>
            <Text className="text-shield-black font-medium">{driversLicenseNumber}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Date of Birth</Text>
            <Text className="text-shield-black font-medium">{dateOfBirth || 'Not provided'}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">VIN</Text>
            <Text className="text-shield-black font-medium">{vin}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text className="text-shield-black font-semibold mb-3">Primary Vehicle</Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Vehicle</Text>
            <Text className="text-shield-black font-medium">{`${carYear} ${carMake} ${carModel}`}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-gray-500">Color</Text>
            <Text className="text-shield-black font-medium">{carColor}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">License Plate</Text>
            <Text className="text-shield-black font-medium">{licensePlate.toUpperCase()}</Text>
          </View>
        </View>
      </Card>

      {/* Submit Button - inline */}
      <View className="mt-6">
        <Button
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="py-5"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">
            {isSubmitting ? 'Saving...' : 'Submit & Lock Profile'}
          </Text>
        </Button>
      </View>

      {/* Back Button */}
      <View className="mt-3">
        <Button
          onPress={handleBack}
          variant="secondary"
          className="py-5 bg-black"
          pill
          fullWidth
        >
          <Text className="text-white font-bold text-lg">Back</Text>
        </Button>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Complete Your Profile',
          headerBackVisible: false,
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
              {renderStepIndicator()}

              {currentStep === 'identity' && renderIdentityStep()}
              {currentStep === 'vehicle' && renderVehicleStep()}
              {currentStep === 'review' && renderReviewStep()}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
