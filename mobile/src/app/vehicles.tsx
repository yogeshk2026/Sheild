import React from 'react';
import { View, ScrollView, Linking, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Car, Lock, Mail, Plus, AlertCircle, Check, Star, Camera, Sparkles, ImageIcon } from 'lucide-react-native';
import { Button, Text, Card } from '@/components/ui';
import { useStore } from '@/lib/store';

const MAX_VEHICLES = 2;

export default function VehiclesScreen() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const vehicles = user?.vehicles || [];
  const profileCompleted = user?.profileCompleted;
  const canAddVehicle = vehicles.length < MAX_VEHICLES;

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@courial.com?subject=Vehicle%20Information%20Update%20Request');
  };

  const handleAddVehicle = () => {
    router.push('/add-vehicle');
  };

  // Empty state - no profile completed
  if (!profileCompleted || vehicles.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Registered Vehicles',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F8FAFC' },
          }}
        />

        <View className="flex-1 bg-shield-surface">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Car size={40} color="#9CA3AF" />
              </View>
              <Text className="text-shield-black text-xl font-bold text-center mb-2">
                No Vehicles Registered
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Complete your profile to register your primary vehicle for coverage verification.
              </Text>
              <Button
                onPress={() => router.push('/complete-profile')}
                pill
                icon={<Plus size={18} color="#FFFFFF" />}
              >
                Complete Profile
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
          title: 'Registered Vehicles',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
        }}
      />

      <View className="flex-1 bg-shield-surface">
        <SafeAreaView className="flex-1" edges={['bottom']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }}
          >
            {/* Locked notice */}
            <Card className="bg-blue-50 border border-blue-200 mb-4">
              <View className="flex-row items-start">
                <Lock size={18} color="#3B82F6" />
                <View className="flex-1 ml-3">
                  <Text className="text-blue-800 font-semibold text-sm">Information Locked</Text>
                  <Text className="text-blue-700 text-xs">
                    To update vehicle info, contact Courial Support.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Vehicle cards */}
            {vehicles.map((vehicle) => {
              return (
                <Card key={vehicle.id} className="mb-4 overflow-hidden p-0">
                  {/* Vehicle image */}
                  {vehicle.imageUrl ? (
                    <View className="relative">
                      <Image
                        source={{ uri: vehicle.imageUrl }}
                        style={{ width: '100%', height: 150 }}
                        contentFit="cover"
                      />
                      {/* Image source badge */}
                      {vehicle.imageSource && (
                        <View className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 flex-row items-center">
                          {vehicle.imageSource === 'camera' && <Camera size={12} color="#FFFFFF" />}
                          {vehicle.imageSource === 'gallery' && <ImageIcon size={12} color="#FFFFFF" />}
                          {vehicle.imageSource === 'ai_generated' && <Sparkles size={12} color="#FFFFFF" />}
                          <Text className="text-white text-xs ml-1">
                            {vehicle.imageSource === 'camera' ? 'Camera' : vehicle.imageSource === 'gallery' ? 'Gallery' : 'AI Generated'}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="w-full h-32 bg-gray-100 items-center justify-center">
                      <Car size={48} color="#9CA3AF" />
                      <Text className="text-gray-400 text-sm mt-2">No photo added</Text>
                    </View>
                  )}

                  <View className="p-4">
                    {/* Vehicle type badge */}
                    {vehicle.isPrimary ? (
                      <View className="flex-row items-center bg-green-100 self-start px-3 py-1 rounded-full mb-3">
                        <Star size={12} color="#15803D" />
                        <Text className="text-green-700 text-xs font-semibold ml-1">PRIMARY VEHICLE</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center bg-blue-100 self-start px-3 py-1 rounded-full mb-3">
                        <Plus size={12} color="#1D4ED8" />
                        <Text className="text-blue-700 text-xs font-semibold ml-1">ADDITIONAL VEHICLE</Text>
                      </View>
                    )}

                    {/* Vehicle name */}
                    <Text className="text-shield-black text-xl font-bold mb-1">
                      {`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    </Text>
                    <Text className="text-gray-500 mb-4">{vehicle.color}</Text>

                    {/* Details */}
                    <View className="bg-gray-50 rounded-xl p-4">
                      <View className="flex-row justify-between py-2 border-b border-gray-200">
                        <Text className="text-gray-500">License Plate</Text>
                        <Text className="text-shield-black font-bold">{vehicle.licensePlate}</Text>
                      </View>
                      <View className="flex-row justify-between py-2 border-b border-gray-200">
                        <Text className="text-gray-500">Make</Text>
                        <Text className="text-shield-black font-medium">{vehicle.make}</Text>
                      </View>
                      <View className="flex-row justify-between py-2 border-b border-gray-200">
                        <Text className="text-gray-500">Model</Text>
                        <Text className="text-shield-black font-medium">{vehicle.model}</Text>
                      </View>
                      <View className="flex-row justify-between py-2 border-b border-gray-200">
                        <Text className="text-gray-500">Year</Text>
                        <Text className="text-shield-black font-medium">{vehicle.year}</Text>
                      </View>
                      <View className="flex-row justify-between py-2">
                        <Text className="text-gray-500">Color</Text>
                        <Text className="text-shield-black font-medium">{vehicle.color}</Text>
                      </View>
                    </View>

                    {/* Registered date */}
                    <Text className="text-gray-400 text-xs text-center mt-4">
                      Registered on {new Date(vehicle.addedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Card>
              );
            })}

            {/* Add Vehicle button - only show if under limit */}
            {canAddVehicle && (
              <Pressable
                onPress={handleAddVehicle}
                className="mb-4 border-2 border-dashed border-gray-300 rounded-2xl py-8 items-center justify-center bg-gray-50"
              >
                <View className="w-14 h-14 rounded-full bg-shield-accent/10 items-center justify-center mb-3">
                  <Plus size={28} color="#F97316" />
                </View>
                <Text className="text-shield-black font-semibold text-base">Add Additional Vehicle</Text>
                <Text className="text-gray-500 text-sm mt-1">You can register 1 more vehicle</Text>
              </Pressable>
            )}

            {/* Vehicle limit reached notice */}
            {!canAddVehicle && (
              <Card className="bg-gray-50 border border-gray-200 mb-4">
                <View className="flex-row items-center">
                  <Check size={18} color="#22C55E" />
                  <Text className="text-gray-600 text-sm ml-2">
                    {`Maximum vehicles registered (${MAX_VEHICLES}/${MAX_VEHICLES})`}
                  </Text>
                </View>
              </Card>
            )}

            {/* Contact support */}
            <View className="mt-4">
              <Button
                onPress={handleContactSupport}
                variant="secondary"
                fullWidth
                pill
                icon={<Mail size={18} color="#FFFFFF" />}
              >
                Contact Support to Update
              </Button>
            </View>

            {/* Disclaimer */}
            <View className="mt-6 p-4 bg-gray-100 rounded-xl">
              <View className="flex-row items-start">
                <AlertCircle size={16} color="#6B7280" />
                <Text className="text-gray-500 text-xs ml-2 flex-1">
                  Vehicle images are for display purposes only and may not exactly represent your vehicle.
                  Actual verification is based on license plate and registration details.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}
