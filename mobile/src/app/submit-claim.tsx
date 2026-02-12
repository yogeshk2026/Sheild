import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Upload, Trash2, Sparkles, ChevronDown, Check, Search, X, FileText, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button, Text, DatePicker, TimePicker, ZipCityState, VehicleModelPicker, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';
import { type Claim, type ContestReason, CONTEST_REASON_LABELS } from '@/lib/types';
import { scanTicketWithAI } from '@/lib/ocrService';
import {
  SCHEMA_MISMATCH_USER_MESSAGE,
  getOptionalUser,
  submitClaimToSupabase,
  uploadTicketImage,
  upsertUser,
  type SupabaseClaimPayload,
} from '@/lib/supabase';
import { generateUUID } from '@/lib/cn';
import { normalizeDate } from '@/lib/ticketScanning';

const GIG_PLATFORMS = [
  { name: 'DoorDash', category: 'Delivery' },
  { name: 'Uber Eats', category: 'Delivery' },
  { name: 'Instacart', category: 'Delivery' },
  { name: 'Grubhub', category: 'Delivery' },
  { name: 'Courial', category: 'Delivery' },
  { name: 'Postmates', category: 'Delivery' },
  { name: 'Amazon Flex', category: 'Delivery' },
  { name: 'Shipt', category: 'Delivery' },
  { name: 'Gopuff', category: 'Delivery' },
  { name: 'Spark (Walmart)', category: 'Delivery' },
  { name: 'Roadie', category: 'Delivery' },
  { name: 'Favor', category: 'Delivery' },
  { name: 'Caviar', category: 'Delivery' },
  { name: 'Seamless', category: 'Delivery' },
  { name: 'Waitr', category: 'Delivery' },
  { name: 'Bite Squad', category: 'Delivery' },
  { name: 'Delivery.com', category: 'Delivery' },
  { name: 'ChowNow', category: 'Delivery' },
  { name: 'EatStreet', category: 'Delivery' },
  { name: 'Slice', category: 'Delivery' },
  { name: 'Uber', category: 'Rideshare' },
  { name: 'Lyft', category: 'Rideshare' },
  { name: 'Via', category: 'Rideshare' },
  { name: 'Alto', category: 'Rideshare' },
  { name: 'Wingz', category: 'Rideshare' },
  { name: 'Curb', category: 'Rideshare' },
  { name: 'Empower', category: 'Rideshare' },
];

const REQUIRED_ORANGE = '#F97316';

const parseDateOnlyToISO = (dateValue?: string | null): string | null => {
  if (!dateValue?.trim()) return null;
  const normalized = normalizeDate(dateValue);
  if (!normalized) return null;
  const [month, day, year] = normalized.split('/');
  if (!month || !day || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const parseTicketDateToISO = (dateValue?: string | null, timeValue?: string): string | null => {
  if (!dateValue?.trim()) return null;
  const normalized = normalizeDate(dateValue);
  if (!normalized) return null;

  const [month, day, year] = normalized.split('/');
  if (!month || !day || !year) return null;

  let hours = 0;
  let minutes = 0;
  if (timeValue?.trim()) {
    const amPmMatch = timeValue.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    const twentyFourHourMatch = timeValue.match(/(\d{1,2}):(\d{2})/);

    if (amPmMatch) {
      hours = parseInt(amPmMatch[1], 10);
      minutes = parseInt(amPmMatch[2], 10);
      const ampm = amPmMatch[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else if (twentyFourHourMatch) {
      hours = parseInt(twentyFourHourMatch[1], 10);
      minutes = parseInt(twentyFourHourMatch[2], 10);
    }
  }

  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0
  );
  if (isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString();
};

const normalizeOptionalDate = (dateValue?: string | null): string | null => {
  if (!dateValue?.trim()) return null;
  return normalizeDate(dateValue);
};

const isSchemaMismatchMessage = (message?: string): boolean => {
  const normalized = message?.toLowerCase() || '';
  return (
    normalized.includes('schema mismatch') ||
    normalized.includes('schema cache') ||
    (normalized.includes('column') && (normalized.includes('does not exist') || normalized.includes('could not find')))
  );
};

export default function SubmitClaimScreen() {
  const router = useRouter();

  const [citationNumber, setCitationNumber] = useState('');
  const [issueDate, setIssueDate] = useState<string | null>(null);
  const [issueTime, setIssueTime] = useState('');
  const [locationOfViolation, setLocationOfViolation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [isRedZone, setIsRedZone] = useState(false);

  const [carMake, setCarMake] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [plateState, setPlateState] = useState('');

  const [vehicleCodeSection, setVehicleCodeSection] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [hasLateFee, setHasLateFee] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [totalDue, setTotalDue] = useState('');
  const [dueAfterDate, setDueAfterDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentDueByDate, setPaymentDueByDate] = useState<string | null>(null);

  const [payOnlineUrl, setPayOnlineUrl] = useState('');
  const [mailPaymentAddress, setMailPaymentAddress] = useState('');
  const [mailPaymentCity, setMailPaymentCity] = useState('');
  const [mailPaymentState, setMailPaymentState] = useState('');
  const [mailPaymentZip, setMailPaymentZip] = useState('');

  const [organizationName, setOrganizationName] = useState('');
  const [organizationAddress, setOrganizationAddress] = useState('');
  const [organizationCity, setOrganizationCity] = useState('');
  const [organizationState, setOrganizationState] = useState('');
  const [organizationZip, setOrganizationZip] = useState('');

  const [gigPlatform, setGigPlatform] = useState('');
  const [wasOnActiveOrder, setWasOnActiveOrder] = useState<boolean | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);
  const [platformSearchQuery, setPlatformSearchQuery] = useState('');

  const [wantsToContest, setWantsToContest] = useState<boolean | null>(null);
  const [contestReasons, setContestReasons] = useState<ContestReason[]>([]);
  const [contestDocuments, setContestDocuments] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState('');
  const [scanning, setScanning] = useState(false);

  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onClose?: () => void;
  }>({ type: 'info', title: '', message: '' });

  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showMessage = useCallback((type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string, onClose?: () => void) => {
    setMessageConfig({ type, title, message, onClose });
    setMessageVisible(true);
  }, []);

  const hideMessage = useCallback(() => {
    setMessageVisible(false);
    if (messageConfig.onClose) {
      const callback = messageConfig.onClose;
      setTimeout(() => {
        try {
          callback();
        } catch (error) {
          console.error('[SubmitClaim] Error in onClose callback:', error);
        }
      }, 300);
    }
  }, [messageConfig.onClose]);

  const user = useStore((s) => s.user);
  const addClaim = useStore((s) => s.addClaim);

  const getRequiredFieldBorderColor = (value: string): string => {
    return value.trim() === '' ? REQUIRED_ORANGE : '#E5E7EB';
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showMessage(
          'error',
          'Camera Permission Required',
          'Please allow camera access in your device settings to take a ticket photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showMessage('error', 'Photo Error', 'Unable to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showMessage(
          'error',
          'Photo Library Permission Required',
          'Please allow photo library access in your device settings to upload a ticket photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showMessage('error', 'Upload Error', 'Unable to select image. Please try again.');
    }
  };

  const removeImage = () => {
    setImageUri('');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
  };

  const scanTicket = async () => {
    if (!imageUri) {
      showMessage('warning', 'No Image', 'Please upload a photo of your ticket first.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setScanning(true);

    try {
      const result = await scanTicketWithAI(imageUri);

      if (!result.success) {
        showMessage('error', 'Scan Failed', result.error || 'Could not read ticket information. Please try again or enter details manually.');
        setScanning(false);
        return;
      }

      if (result.data || result.rawAIData) {
        const ai = result.rawAIData || {};
        const extracted = result.data;

        if (ai.citationNumber || extracted?.ticketNumber) {
          setCitationNumber((ai.citationNumber || extracted?.ticketNumber || '').toUpperCase());
        }

        const normalizedIssueDate = normalizeDate(ai.issueDate || extracted?.issueDate || '');
        if (normalizedIssueDate) setIssueDate(normalizedIssueDate);

        if (ai.issueTime) setIssueTime(ai.issueTime);
        if (ai.fineAmount) setFineAmount(String(ai.fineAmount));
        if (ai.totalDue) setTotalDue(String(ai.totalDue));
        if (ai.vehicleCodeSection) setVehicleCodeSection(ai.vehicleCodeSection);
        if (ai.locationOfViolation || extracted?.locationAddress) {
          setLocationOfViolation(ai.locationOfViolation || extracted?.locationAddress || '');
        }
        if (ai.city || extracted?.issuingCity) setCity((ai.city || extracted?.issuingCity || '').trim());
        if (ai.state || extracted?.issuingState) setState((ai.state || extracted?.issuingState || '').toUpperCase());
        if (ai.zip) setZip(ai.zip);
        if (ai.meterNumber) setMeterNumber(ai.meterNumber);
        if (ai.isRedZone !== undefined) setIsRedZone(ai.isRedZone);
        if (ai.vehicleMake) setCarMake(ai.vehicleMake);
        if (ai.vehicleModel) setCarModel(ai.vehicleModel);
        if (ai.vehicleColor) setCarColor(ai.vehicleColor);
        if (ai.plateNumber || extracted?.vehiclePlate) setPlateNumber((ai.plateNumber || extracted?.vehiclePlate || '').toUpperCase());
        if (ai.plateState || extracted?.vehicleState) setPlateState((ai.plateState || extracted?.vehicleState || '').toUpperCase());
        if (ai.lateFeeAmount) {
          setHasLateFee(true);
          setLateFeeAmount(String(ai.lateFeeAmount));
        }
        if (ai.dueAfterDate) setDueAfterDate(normalizeDate(ai.dueAfterDate) || ai.dueAfterDate);
        if (ai.dueDate) setDueDate(normalizeDate(ai.dueDate) || ai.dueDate);
        if (ai.paymentDueByDate) {
          const normalizedPaymentDueByDate = normalizeDate(ai.paymentDueByDate);
          if (normalizedPaymentDueByDate) {
            setPaymentDueByDate(normalizedPaymentDueByDate);
          }
        }
        if (ai.payOnlineUrl) setPayOnlineUrl(ai.payOnlineUrl);
        if (ai.mailPaymentAddress) setMailPaymentAddress(ai.mailPaymentAddress);
        if (ai.mailPaymentCity) setMailPaymentCity(ai.mailPaymentCity);
        if (ai.mailPaymentState) setMailPaymentState(ai.mailPaymentState);
        if (ai.mailPaymentZip) setMailPaymentZip(ai.mailPaymentZip);
        if (ai.organizationName) setOrganizationName(ai.organizationName);
        if (ai.organizationAddress) setOrganizationAddress(ai.organizationAddress);

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}

        showMessage('success', 'Scan Complete', 'Ticket information extracted successfully. Please review and complete any missing fields marked with *');
      }
    } catch (error) {
      console.error('Scan error:', error);
      showMessage('error', 'Scan Error', 'Unable to scan ticket. Please try again or enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  const isFormValid = (): boolean => {
    const totalAmount = Number(totalDue) || Number(fineAmount) || 0;
    return Boolean(
      imageUri &&
      citationNumber.trim() &&
      city.trim() &&
      state.trim() &&
      zip.trim() &&
      vehicleCodeSection.trim() &&
      locationOfViolation.trim() &&
      plateNumber.trim() &&
      totalAmount > 0
    );
  };

  const handleSubmit = async () => {
    console.log('[SubmitClaim] handleSubmit START');

    try {
      if (!user?.profileCompleted || !user?.driversLicenseNumber) {
        showMessage(
          'warning',
          'Profile Incomplete',
          'Complete your profile (including a valid driver license) before submitting a claim.',
          () => router.push('/complete-profile')
        );
        return;
      }

      if (!isFormValid()) {
        showMessage(
          'warning',
          'Missing Required Fields',
          'Please complete all required ticket fields, including photo, citation number, location, and amount.'
        );
        return;
      }

      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setLoading(true);
      const cloudUser = await getOptionalUser();
      const canSyncToCloud = Boolean(cloudUser?.id);

      const normalizedIssueDate = normalizeOptionalDate(issueDate);
      const normalizedPaymentDueByDate = normalizeOptionalDate(paymentDueByDate);
      const normalizedDueDate = normalizeDate(dueDate) || dueDate;
      const normalizedDueAfterDate = normalizeDate(dueAfterDate) || dueAfterDate;

      let ticketImageUrl: string | null = null;
      if (canSyncToCloud && cloudUser?.id) {
        try {
          const uploadResult = await uploadTicketImage(imageUri, cloudUser.id);
          if (uploadResult.success && uploadResult.url) {
            ticketImageUrl = uploadResult.url;
          } else {
            setIsSubmitting(false);
            setLoading(false);
            showMessage('error', 'Upload Failed', uploadResult.error || 'Ticket image upload failed. Please try again.');
            return;
          }
        } catch (uploadError) {
          console.warn('[SubmitClaim] Image upload error:', uploadError);
          setIsSubmitting(false);
          setLoading(false);
          showMessage('error', 'Upload Failed', 'Unable to upload ticket image. Please check your connection and try again.');
          return;
        }
      } else {
        console.log('User not authenticated — saving locally only.');
      }

      const fullLocation = `${locationOfViolation}, ${city}, ${state} ${zip}`;

      const ticketDateISO = parseTicketDateToISO(normalizedIssueDate, issueTime);
      const issueDateOnlyISO = parseDateOnlyToISO(normalizedIssueDate);
      const paymentDueByISO = parseDateOnlyToISO(normalizedPaymentDueByDate);
      const dueDateISO = parseDateOnlyToISO(normalizedDueDate);
      const dueAfterDateISO = parseDateOnlyToISO(normalizedDueAfterDate);

      const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.name || null;
      const userEmail = user?.email || null;

      const supabasePayload: SupabaseClaimPayload = {
        ticket_number: citationNumber.toUpperCase(),
        violation_type: vehicleCodeSection,
        amount: Number(totalDue) || Number(fineAmount) || 0,
        ticket_date: ticketDateISO,
        issue_date: issueDateOnlyISO,
        issue_time: issueTime || null,
        payment_due_by: paymentDueByISO || null,
        due_date: dueDateISO,
        due_after_date: dueAfterDateISO,
        location: fullLocation,
        plate_number: plateNumber.toUpperCase(),
        vehicle_make: carMake,
        vehicle_color: carColor,
        status: 'submitted',
        risk_score: 0,
        ticket_image_url: ticketImageUrl,
        user_id: cloudUser?.id || user?.id || 'guest-local',
        user_name: userName,
        user_email: userEmail,
        user_plan: user?.plan || null,
      };

      // Sync denormalized public user profile (non-blocking). Claims FK still uses auth.users.id.
      if (cloudUser?.id && cloudUser.email) {
        try {
          await upsertUser({
            id: cloudUser.id,
            email: cloudUser.email,
            name: user?.name || cloudUser.user_metadata?.name,
            phone: user?.phone,
            plan: user?.plan,
          });
        } catch (upsertError) {
          console.warn('[SubmitClaim] User upsert error (non-blocking):', upsertError);
        }
      }

      let supabaseResult: { success: boolean; syncedToCloud: boolean; data?: { id: string }; error?: string };
      try {
        supabaseResult = await submitClaimToSupabase(supabasePayload);
      } catch (supabaseError) {
        supabaseResult = {
          success: false,
          syncedToCloud: canSyncToCloud,
          error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
        };
      }

      if (!supabaseResult.success) {
        setIsSubmitting(false);
        setLoading(false);
        showMessage(
          'error',
          'Submission Failed',
          isSchemaMismatchMessage(supabaseResult.error)
            ? SCHEMA_MISMATCH_USER_MESSAGE
            : supabaseResult.error || 'Failed to create claim in backend.'
        );
        return;
      }

      const claimId = supabaseResult.data?.id || generateUUID();
      const newClaim: Claim = {
        id: claimId,
        userId: cloudUser?.id || user?.id || 'guest-local',
        ticketDate: ticketDateISO || normalizedIssueDate || '',
        issueDate: normalizedIssueDate || undefined,
        issueDateISO: ticketDateISO,
        issueTime: issueTime || undefined,
        paymentDueByDate: normalizedPaymentDueByDate || undefined,
        paymentDueByDateISO: paymentDueByISO,
        dueDate: normalizedDueDate || undefined,
        dueAfterDate: normalizedDueAfterDate || undefined,
        city: city,
        state: state || 'CA',
        violationType: vehicleCodeSection || 'parking_meter',
        ticketNumber: citationNumber.toUpperCase(),
        amount: Number(totalDue) || Number(fineAmount) || 0,
        imageUri: ticketImageUrl || imageUri,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wantsToContest: wantsToContest ?? false,
        contestReasons: wantsToContest ? contestReasons : [],
        contestDocuments: wantsToContest ? contestDocuments : [],
      };

      if (!claimId || !newClaim.ticketNumber) {
        setIsSubmitting(false);
        setLoading(false);
        showMessage('error', 'Submission Failed', 'Unable to create claim. Please check your information and try again.');
        return;
      }

      try {
        addClaim(newClaim);
      } catch (storeError) {
        throw storeError;
      }

      setSubmittedClaimId(claimId);
      setIsSubmitting(false);
      setLoading(false);
      showMessage(
        'success',
        'Claim Submitted',
        supabaseResult.syncedToCloud
          ? 'Your claim has been submitted successfully.'
          : 'Claim saved locally. Sign in to sync across devices.',
        () => router.replace('/(tabs)')
      );
    } catch (error) {
      setIsSubmitting(false);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong while submitting your claim.';
      showMessage('error', 'Submission Failed', errorMessage + ' Please try again.');
    }
  };

  const toggleContestReason = (reason: ContestReason) => {
    setContestReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const pickContestDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setContestDocuments(prev => [...prev, result.assets[0].uri]);
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
      }
    } catch (error) {
      console.error('Error picking document:', error);
      showMessage('error', 'Upload Error', 'Unable to select document. Please try again.');
    }
  };

  const removeContestDocument = (index: number) => {
    setContestDocuments(prev => prev.filter((_, i) => i !== index));
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
  };

  const filteredPlatforms = GIG_PLATFORMS.filter(p =>
    p.name.toLowerCase().includes(platformSearchQuery.toLowerCase())
  );

  const deliveryPlatforms = filteredPlatforms.filter(p => p.category === 'Delivery');
  const ridesharePlatforms = filteredPlatforms.filter(p => p.category === 'Rideshare');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-shield-black text-2xl font-bold mb-4">
            {'Ticket Details'}
          </Text>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-sm font-semibold text-shield-black mb-3">
                {'Ticket Photo '}
                <Text style={{ color: REQUIRED_ORANGE }}>{'(Required*)'}</Text>
              </Text>

              {imageUri ? (
                <View>
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E5E7EB' }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={removeImage}
                      style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={20} color="#FFFFFF" />
                    </Pressable>
                  </View>

                  <Button
                    onPress={scanTicket}
                    variant="primary"
                    size="lg"
                    fullWidth
                    pill
                    loading={scanning}
                    icon={<Sparkles size={20} color="#FFFFFF" />}
                    className="mt-4"
                  >
                    {scanning ? 'Scanning...' : 'Scan with AI'}
                  </Button>
                </View>
              ) : (
                <View className="flex-row" style={{ gap: 12 }}>
                  <Pressable
                    onPress={takePhoto}
                    style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderStyle: 'dashed', borderColor: REQUIRED_ORANGE, borderRadius: 16, padding: 20, alignItems: 'center' }}
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
                      <Camera size={24} color="#FFFFFF" />
                    </View>
                    <Text className="text-sm font-semibold text-shield-black">
                      {'Take Photo'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={pickImage}
                    style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderStyle: 'dashed', borderColor: REQUIRED_ORANGE, borderRadius: 16, padding: 20, alignItems: 'center' }}
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
                      <Upload size={24} color="#FFFFFF" />
                    </View>
                    <Text className="text-sm font-semibold text-shield-black">
                      {'Upload Photo'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Citation Information'}
              </Text>

              <View style={{ gap: 16 }}>
                <TextInput
                  value={citationNumber}
                  onChangeText={setCitationNumber}
                  placeholder="Citation Number *"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(citationNumber), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DatePicker
                      value={issueDate || ''}
                      onChange={(value) => setIssueDate(value || null)}
                      placeholder="Select issue date (optional)"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimePicker
                      value={issueTime}
                      onChange={setIssueTime}
                      placeholder="Time"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={fineAmount}
                      onChangeText={setFineAmount}
                      placeholder="Fine Amount * ($)"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(fineAmount), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={totalDue}
                      onChangeText={setTotalDue}
                      placeholder="Total Due * ($)"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(totalDue), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                </View>

                <TextInput
                  value={vehicleCodeSection}
                  onChangeText={setVehicleCodeSection}
                  placeholder="Vehicle Code Section *"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(vehicleCodeSection), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Location Information'}
              </Text>

              <View style={{ gap: 16 }}>
                <ZipCityState
                  zip={zip}
                  city={city}
                  state={state}
                  onZipChange={setZip}
                  onCityChange={setCity}
                  onStateChange={setState}
                  required
                  getRequiredFieldBorderColor={getRequiredFieldBorderColor}
                />

                <TextInput
                  value={locationOfViolation}
                  onChangeText={setLocationOfViolation}
                  placeholder="Location of Violation *"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(locationOfViolation), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={meterNumber}
                      onChangeText={setMeterNumber}
                      placeholder="Meter Number"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text className="text-sm font-semibold text-shield-black">
                      {'Red Zone?'}
                    </Text>
                    <Switch
                      value={isRedZone}
                      onValueChange={setIsRedZone}
                      trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Vehicle Information'}
              </Text>

              <View style={{ gap: 16 }}>
                <VehicleModelPicker
                  model={carModel}
                  make={carMake}
                  onModelChange={setCarModel}
                  onMakeChange={setCarMake}
                  required
                  getRequiredFieldBorderColor={getRequiredFieldBorderColor}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={carColor}
                      onChangeText={setCarColor}
                      placeholder="Color *"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(carColor), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={carYear}
                      onChangeText={setCarYear}
                      placeholder="Year *"
                      keyboardType="number-pad"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(carYear), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      value={plateNumber}
                      onChangeText={setPlateNumber}
                      placeholder="Plate Number *"
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(plateNumber), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={plateState}
                      onChangeText={setPlateState}
                      placeholder="State *"
                      maxLength={2}
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(plateState), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Payment Information'}
              </Text>

              <View style={{ gap: 16 }}>
                <DatePicker
                  value={paymentDueByDate || ''}
                  onChange={(value) => setPaymentDueByDate(value || null)}
                  placeholder="Select payment due date (optional)"
                />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text className="text-sm font-medium text-shield-black">
                    {'Late Fee Applied?'}
                  </Text>
                  <Switch
                    value={hasLateFee}
                    onValueChange={setHasLateFee}
                    trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {hasLateFee ? (
                  <TextInput
                    value={lateFeeAmount}
                    onChangeText={setLateFeeAmount}
                    placeholder="Late Fee Amount ($)"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                    style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                  />
                ) : null}

                <TextInput
                  value={payOnlineUrl}
                  onChangeText={setPayOnlineUrl}
                  placeholder="Pay Online URL"
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Issuing Authority'}
              </Text>

              <View style={{ gap: 16 }}>
                <TextInput
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  placeholder="Organization Name *"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(organizationName), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />

                <TextInput
                  value={organizationAddress}
                  onChangeText={setOrganizationAddress}
                  placeholder="Address *"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(organizationAddress), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={organizationCity}
                      onChangeText={setOrganizationCity}
                      placeholder="City *"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(organizationCity), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flex: 0.5 }}>
                    <TextInput
                      value={organizationState}
                      onChangeText={setOrganizationState}
                      placeholder="State *"
                      maxLength={2}
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(organizationState), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <TextInput
                      value={organizationZip}
                      onChangeText={setOrganizationZip}
                      placeholder="Zip *"
                      keyboardType="number-pad"
                      maxLength={5}
                      placeholderTextColor="#9CA3AF"
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(organizationZip), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-4">
                {'Gig Work Information'}
              </Text>

              <View style={{ gap: 16 }}>
                <View>
                  <Text className="text-sm font-medium text-shield-black mb-2">
                    {'Platform '}
                    <Text style={{ color: REQUIRED_ORANGE }}>{'*'}</Text>
                  </Text>

                  {isCustomPlatform ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          value={gigPlatform}
                          onChangeText={setGigPlatform}
                          placeholder="Enter platform name"
                          placeholderTextColor="#9CA3AF"
                          style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(gigPlatform), borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#000000' }}
                        />
                      </View>
                      <Pressable
                        onPress={() => {
                          setIsCustomPlatform(false);
                          setGigPlatform('');
                        }}
                        style={{ height: 48, width: 48, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={20} color="#6B7280" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setShowPlatformDropdown(true)}
                      style={{ height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: getRequiredFieldBorderColor(gigPlatform), borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ fontSize: 16, color: gigPlatform ? '#000000' : '#9CA3AF' }}>
                        {gigPlatform ? gigPlatform : 'Select platform'}
                      </Text>
                      <ChevronDown size={20} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>

                <View>
                  <Text className="text-sm font-medium text-shield-black mb-2">
                    {'Were you on an active order when you received this ticket? '}
                    <Text style={{ color: REQUIRED_ORANGE }}>{'*'}</Text>
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable
                      onPress={() => setWasOnActiveOrder(true)}
                      style={{ flex: 1, height: 48, backgroundColor: wasOnActiveOrder === true ? '#FFF7ED' : '#FFFFFF', borderWidth: 2, borderColor: wasOnActiveOrder === true ? REQUIRED_ORANGE : '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                    >
                      {wasOnActiveOrder === true ? (
                        <Check size={18} color={REQUIRED_ORANGE} style={{ marginRight: 6 }} />
                      ) : null}
                      <Text style={{ fontSize: 16, fontWeight: wasOnActiveOrder === true ? '600' : '400', color: wasOnActiveOrder === true ? REQUIRED_ORANGE : '#000000' }}>
                        {'Yes'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setWasOnActiveOrder(false)}
                      style={{ flex: 1, height: 48, backgroundColor: wasOnActiveOrder === false ? '#FFF7ED' : '#FFFFFF', borderWidth: 2, borderColor: wasOnActiveOrder === false ? REQUIRED_ORANGE : '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                    >
                      {wasOnActiveOrder === false ? (
                        <Check size={18} color={REQUIRED_ORANGE} style={{ marginRight: 6 }} />
                      ) : null}
                      <Text style={{ fontSize: 16, fontWeight: wasOnActiveOrder === false ? '600' : '400', color: wasOnActiveOrder === false ? REQUIRED_ORANGE : '#000000' }}>
                        {'No'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', backgroundColor: '#FFFFFF', marginBottom: 24, overflow: 'hidden' }}>
            <View className="p-4">
              <Text className="text-base font-bold text-shield-black mb-2">
                {'Contest This Summons'}
              </Text>
              <Text className="text-sm text-gray-500 mb-4">
                {'Do you wish to contest this summons? '}
                <Text style={{ color: REQUIRED_ORANGE }}>{'*'}</Text>
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <Pressable
                  onPress={() => setWantsToContest(true)}
                  style={{ flex: 1, height: 48, backgroundColor: wantsToContest === true ? '#FFF7ED' : '#FFFFFF', borderWidth: 2, borderColor: wantsToContest === true ? REQUIRED_ORANGE : '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                >
                  {wantsToContest === true ? (
                    <Check size={18} color={REQUIRED_ORANGE} style={{ marginRight: 6 }} />
                  ) : null}
                  <Text style={{ fontSize: 16, fontWeight: wantsToContest === true ? '600' : '400', color: wantsToContest === true ? REQUIRED_ORANGE : '#000000' }}>
                    {'Yes'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setWantsToContest(false);
                    setContestReasons([]);
                    setContestDocuments([]);
                  }}
                  style={{ flex: 1, height: 48, backgroundColor: wantsToContest === false ? '#FFF7ED' : '#FFFFFF', borderWidth: 2, borderColor: wantsToContest === false ? REQUIRED_ORANGE : '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                >
                  {wantsToContest === false ? (
                    <Check size={18} color={REQUIRED_ORANGE} style={{ marginRight: 6 }} />
                  ) : null}
                  <Text style={{ fontSize: 16, fontWeight: wantsToContest === false ? '600' : '400', color: wantsToContest === false ? REQUIRED_ORANGE : '#000000' }}>
                    {'No'}
                  </Text>
                </Pressable>
              </View>

              {wantsToContest === true ? (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-sm font-medium text-shield-black mb-2">
                      {'Select all reasons that apply: '}
                      <Text style={{ color: REQUIRED_ORANGE }}>{'*'}</Text>
                    </Text>

                    <View style={{ gap: 8 }}>
                      {(Object.keys(CONTEST_REASON_LABELS) as ContestReason[]).map((reason) => {
                        const isSelected = contestReasons.includes(reason);
                        return (
                          <Pressable
                            key={reason}
                            onPress={() => toggleContestReason(reason)}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isSelected ? '#FFF7ED' : '#F9FAFB', borderWidth: 1, borderColor: isSelected ? REQUIRED_ORANGE : '#E5E7EB', borderRadius: 12 }}
                          >
                            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? REQUIRED_ORANGE : '#D1D5DB', backgroundColor: isSelected ? REQUIRED_ORANGE : '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                              {isSelected ? (
                                <Check size={14} color="#FFFFFF" />
                              ) : null}
                            </View>
                            <Text style={{ flex: 1, fontSize: 14, color: '#000000' }}>
                              {CONTEST_REASON_LABELS[reason]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-medium text-shield-black mb-1">
                      {'Supporting Documents'}
                    </Text>
                    <Text className="text-xs text-gray-500 mb-3">
                      {'Examples include vehicle registration or photos of the vehicle'}
                    </Text>

                    {contestDocuments.length > 0 ? (
                      <View style={{ gap: 8, marginBottom: 12 }}>
                        {contestDocuments.map((docUri, index) => (
                          <View
                            key={index}
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12 }}
                          >
                            <FileText size={20} color="#6B7280" />
                            <Text className="flex-1 text-sm text-shield-black ml-3" numberOfLines={1}>
                              {`Document ${index + 1}`}
                            </Text>
                            <Pressable
                              onPress={() => removeContestDocument(index)}
                              hitSlop={8}
                            >
                              <Trash2 size={18} color="#EF4444" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Pressable
                      onPress={pickContestDocument}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 12 }}
                    >
                      <Plus size={18} color="#6B7280" />
                      <Text className="text-sm text-gray-600 ml-2">
                        {'Add Document'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ gap: 12, marginBottom: 40 }}>
            <Button
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              pill
              loading={loading}
              disabled={loading}
            >
              {'Submit Claim'}
            </Button>

            <Button
              onPress={() => router.back()}
              variant="ghost"
              size="lg"
              fullWidth
              pill
              disabled={loading}
            >
              {'Back'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPlatformDropdown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlatformDropdown(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
              {'Select Platform'}
            </Text>
            <Pressable onPress={() => setShowPlatformDropdown(false)} hitSlop={8}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 48 }}>
              <Search size={20} color="#9CA3AF" />
              <TextInput
                value={platformSearchQuery}
                onChangeText={setPlatformSearchQuery}
                placeholder="Search platforms..."
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, marginLeft: 8, fontSize: 16, color: '#000000' }}
              />
              {platformSearchQuery.length > 0 ? (
                <Pressable onPress={() => setPlatformSearchQuery('')} hitSlop={8}>
                  <X size={18} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              {deliveryPlatforms.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>
                    {'DELIVERY'}
                  </Text>
                  {deliveryPlatforms.map((platform, index) => {
                    const isSelected = gigPlatform === platform.name;
                    return (
                      <Pressable
                        key={`delivery-${index}`}
                        onPress={() => {
                          setGigPlatform(platform.name);
                          setShowPlatformDropdown(false);
                          setPlatformSearchQuery('');
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: isSelected ? '#FFF7ED' : '#FFFFFF', borderRadius: 12, marginBottom: 8, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? REQUIRED_ORANGE : 'transparent' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: isSelected ? '600' : '400', color: isSelected ? REQUIRED_ORANGE : '#000000' }}>
                          {platform.name}
                        </Text>
                        {isSelected ? (
                          <Check size={20} color={REQUIRED_ORANGE} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {ridesharePlatforms.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>
                    {'RIDESHARE'}
                  </Text>
                  {ridesharePlatforms.map((platform, index) => {
                    const isSelected = gigPlatform === platform.name;
                    return (
                      <Pressable
                        key={`rideshare-${index}`}
                        onPress={() => {
                          setGigPlatform(platform.name);
                          setShowPlatformDropdown(false);
                          setPlatformSearchQuery('');
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: isSelected ? '#FFF7ED' : '#FFFFFF', borderRadius: 12, marginBottom: 8, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? REQUIRED_ORANGE : 'transparent' }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: isSelected ? '600' : '400', color: isSelected ? REQUIRED_ORANGE : '#000000' }}>
                          {platform.name}
                        </Text>
                        {isSelected ? (
                          <Check size={20} color={REQUIRED_ORANGE} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  setIsCustomPlatform(true);
                  setShowPlatformDropdown(false);
                  setPlatformSearchQuery('');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 12, marginTop: 16 }}
              >
                <Plus size={18} color="#6B7280" />
                <Text style={{ fontSize: 16, color: '#6B7280', marginLeft: 8 }}>
                  {'Other Platform'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <SystemMessage
        visible={messageVisible}
        onClose={hideMessage}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
      />
    </SafeAreaView>
  );
}
