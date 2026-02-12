import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, ActionSheetIOS, Platform, Linking, Modal } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Camera, Lock, Mail, AlertCircle, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Button, Text, Card, SystemMessage } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const profileCompleted = user?.profileCompleted;
  const profileLocked = !!user?.profileLockedAt;

  // Only profile image can be changed (email is set at signup and locked)
  const email = user?.email || '';
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [saving, setSaving] = useState(false);

  // System message state
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageConfig, setMessageConfig] = useState<{
    type: 'error' | 'success' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    showSettingsButton?: boolean;
  }>({ type: 'info', title: '', message: '', showSettingsButton: false });

  // Android photo picker modal
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const showMessage = (type: 'error' | 'success' | 'warning' | 'info' | 'confirm', title: string, message: string, showSettingsButton?: boolean) => {
    setMessageConfig({ type, title, message, showSettingsButton });
    setMessageVisible(true);
  };

  const openAppSettings = () => {
    Linking.openSettings();
    setMessageVisible(false);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showMessage('error', 'Photo Error', 'Unable to select image. Please try again.');
    }
  };

  const handleChangePhoto = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImage(true);
          } else if (buttonIndex === 2) {
            pickImage(false);
          }
        }
      );
    } else {
      setShowPhotoOptions(true);
    }
  };

  const handleSave = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Only update profile image (email cannot be changed)
    updateUser({
      profileImage: profileImage || undefined,
    });

    setSaving(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    router.back();
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@courial.com?subject=Profile%20Information%20Update%20Request');
  };

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || 'Driver';

  return (
    <View className="flex-1 bg-shield-surface">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="items-center py-8"
          >
            <Pressable onPress={handleChangePhoto} className="relative">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}>
                  <User size={48} color="#FFFFFF" strokeWidth={1.5} />
                </View>
              )}
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center shadow-sm">
                <Camera size={16} color="#6B7280" />
              </View>
            </Pressable>
            <Pressable onPress={handleChangePhoto}>
              <Text className="font-medium mt-3" style={{ color: 'rgba(0, 0, 0, 0.65)' }}>Change Photo</Text>
            </Pressable>
          </Animated.View>

          {/* Locked Profile Notice */}
          {profileLocked && (
            <Animated.View
              entering={FadeInDown.delay(150).springify()}
              className="px-5 mb-4"
            >
              <Card className="bg-amber-50 border border-amber-200">
                <View className="flex-row items-start">
                  <Lock size={20} color="#F59E0B" />
                  <View className="flex-1 ml-3">
                    <Text className="text-amber-800 font-semibold mb-1">Profile Locked</Text>
                    <Text className="text-amber-700 text-sm">
                      Your identity information is verified and locked for security. Only your photo can be changed. To update other details, contact Courial Support.
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Email & Phone Immutability Notice - Always shown */}
          <Animated.View
            entering={FadeInDown.delay(profileLocked ? 175 : 150).springify()}
            className="px-5 mb-4"
          >
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE', padding: 16 }}>
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#3B82F6" />
                <View className="flex-1 ml-3">
                  <Text className="text-blue-800 font-semibold mb-1">Important Notice</Text>
                  <Text className="text-blue-700 text-sm">
                    Your email address and phone number cannot be changed without contacting support. This is required for account security and claim verification.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Form Fields */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="px-5"
          >
            {/* Locked Fields Section */}
            {profileLocked && (
              <>
                <Text className="text-gray-500 text-xs uppercase tracking-wide mb-3">
                  Verified Information (Read Only)
                </Text>

                {/* Legal Name - Locked */}
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">Legal Name</Text>
                  <View className="bg-gray-100 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                    <Text className="text-gray-600 flex-1">
                      {`${user?.firstName || ''} ${user?.lastName || ''}`}
                    </Text>
                    <Lock size={16} color="#9CA3AF" />
                  </View>
                </View>

                {/* Phone - Locked */}
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">Phone Number</Text>
                  <View className="bg-gray-100 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                    <Text className="text-gray-600 flex-1">{user?.phone || '-'}</Text>
                    <Lock size={16} color="#9CA3AF" />
                  </View>
                </View>

                {/* Address - Locked */}
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">Address</Text>
                  <View className="bg-gray-100 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                    <Text className="text-gray-600 flex-1">
                      {user?.address ?
                        `${user.address.street}, ${user.address.city}, ${user.address.state} ${user.address.zipCode}`
                        : '-'}
                    </Text>
                    <Lock size={16} color="#9CA3AF" />
                  </View>
                </View>

                <View className="h-px bg-gray-200 my-4" />

                <Text className="text-gray-500 text-xs uppercase tracking-wide mb-3">
                  Editable Information
                </Text>
              </>
            )}

            {/* Email - Read Only */}
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-2">Email Address</Text>
              <View className="bg-gray-100 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                <Text className="flex-1" style={{ color: email ? '#000000' : 'rgba(0, 0, 0, 0.25)' }}>
                  {email || 'No email set'}
                </Text>
                <Lock size={16} color="#9CA3AF" />
              </View>
            </View>

            {/* Phone - Read Only (shown when not locked to display verified phone) */}
            {!profileLocked && user?.phone && (
              <View className="mb-5">
                <Text className="text-gray-500 text-sm mb-2">Phone Number</Text>
                <View className="bg-gray-100 rounded-xl px-4 py-4 border border-gray-200 flex-row items-center">
                  <Text className="flex-1" style={{ color: '#000000' }}>
                    {user.phone}
                  </Text>
                  <Lock size={16} color="#9CA3AF" />
                </View>
                {user.phoneVerified && (
                  <Text className="text-green-600 text-xs mt-1">
                    ✓ Verified
                  </Text>
                )}
              </View>
            )}

            {/* Complete Profile Button (if not completed) */}
            {!profileCompleted && (
              <View className="mb-5">
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 20, borderWidth: 1, borderColor: '#FED7AA', padding: 16 }}>
                  <View className="flex-row items-start">
                    <AlertCircle size={20} color="#F97316" />
                    <View className="flex-1 ml-3">
                      <Text className="text-orange-800 font-semibold mb-1">Complete Your Profile</Text>
                      <Text className="text-orange-700 text-sm mb-3">
                        To submit claims, you need to complete your profile with identity and vehicle information.
                      </Text>
                      <View className="items-center">
                        <Button
                          onPress={() => router.push('/complete-profile')}
                          size="sm"
                          pill
                          className="bg-black px-6"
                        >
                          <Text className="text-white font-semibold">Complete Profile</Text>
                        </Button>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Contact Support Button (if locked) */}
            {profileLocked && (
              <Pressable
                onPress={handleContactSupport}
                className="flex-row items-center justify-center py-3"
              >
                <Mail size={16} color="#F97316" />
                <Text className="text-shield-accent font-medium ml-2">
                  Contact Support to Update Locked Information
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>

        {/* Save Button */}
        <View className="px-5 pb-2">
          <Button onPress={handleSave} loading={saving} fullWidth size="lg" pill>
            Save Changes
          </Button>
        </View>

        {/* Back Button */}
        <View className="px-5 pb-4">
          <Button onPress={() => router.back()} variant="secondary" fullWidth size="lg" pill className="bg-black">
            <Text className="text-white font-semibold">Back</Text>
          </Button>
        </View>
      </SafeAreaView>

      {/* System Message Modal */}
      <SystemMessage
        visible={messageVisible}
        onClose={() => setMessageVisible(false)}
        type={messageConfig.type}
        title={messageConfig.title}
        message={messageConfig.message}
        buttons={messageConfig.showSettingsButton ? [
          { text: 'Open Settings', onPress: openAppSettings, variant: 'primary' },
          { text: 'Cancel', onPress: () => setMessageVisible(false), variant: 'cancel' },
        ] : undefined}
      />

      {/* Android Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setShowPhotoOptions(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center">
                  <Camera size={32} color="#F97316" />
                </View>
              </View>

              <Text className="text-shield-black text-xl font-bold text-center mb-2">
                Change Photo
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                How would you like to update your profile photo?
              </Text>

              <View className="items-center" style={{ gap: 12 }}>
                <Button
                  onPress={() => {
                    setShowPhotoOptions(false);
                    pickImage(true);
                  }}
                  size="lg"
                  pill
                  className="px-8"
                >
                  Take Photo
                </Button>
                <Button
                  onPress={() => {
                    setShowPhotoOptions(false);
                    pickImage(false);
                  }}
                  variant="secondary"
                  size="lg"
                  pill
                  className="px-8"
                >
                  Choose from Library
                </Button>
              </View>
              <Pressable
                onPress={() => setShowPhotoOptions(false)}
                className="py-3 mt-2"
              >
                <Text className="text-gray-500 text-center font-medium">Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
