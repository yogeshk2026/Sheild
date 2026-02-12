import React, { useState } from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Clock, ChevronUp, ChevronDown, X } from 'lucide-react-native';
import { Text } from './Text';
import * as Haptics from 'expo-haptics';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  style?: object;
  required?: boolean;
  getRequiredFieldBorderColor?: (value: string) => string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select Time',
  style,
  required = false,
  getRequiredFieldBorderColor,
}: TimePickerProps) {
  const [showModal, setShowModal] = useState(false);

  // Parse existing value or use current time
  const parseTime = (timeStr: string) => {
    if (!timeStr) {
      const now = new Date();
      return {
        hours: now.getHours() % 12 || 12,
        minutes: Math.floor(now.getMinutes() / 5) * 5,
        period: now.getHours() >= 12 ? 'PM' : 'AM',
      };
    }

    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10),
        period: match[3].toUpperCase() as 'AM' | 'PM',
      };
    }

    const now = new Date();
    return {
      hours: now.getHours() % 12 || 12,
      minutes: Math.floor(now.getMinutes() / 5) * 5,
      period: now.getHours() >= 12 ? 'PM' : 'AM',
    };
  };

  const [selectedTime, setSelectedTime] = useState(() => parseTime(value));

  const formatTime = (hours: number, minutes: number, period: string): string => {
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    return `${h}:${m} ${period}`;
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      setSelectedTime(parseTime(value));
    }
    setShowModal(true);
  };

  const incrementHours = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime((prev) => ({
      ...prev,
      hours: prev.hours === 12 ? 1 : prev.hours + 1,
    }));
  };

  const decrementHours = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime((prev) => ({
      ...prev,
      hours: prev.hours === 1 ? 12 : prev.hours - 1,
    }));
  };

  const incrementMinutes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime((prev) => ({
      ...prev,
      minutes: prev.minutes === 55 ? 0 : prev.minutes + 5,
    }));
  };

  const decrementMinutes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime((prev) => ({
      ...prev,
      minutes: prev.minutes === 0 ? 55 : prev.minutes - 5,
    }));
  };

  const togglePeriod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTime((prev) => ({
      ...prev,
      period: prev.period === 'AM' ? 'PM' : 'AM',
    }));
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(formatTime(selectedTime.hours, selectedTime.minutes, selectedTime.period));
    setShowModal(false);
  };

  const borderColor = required && getRequiredFieldBorderColor
    ? getRequiredFieldBorderColor(value)
    : '#E5E7EB';

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={[
          {
            height: 48,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: borderColor,
            borderRadius: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        <Text
          style={{
            fontSize: 16,
            color: value ? '#000000' : '#9CA3AF'
          }}
        >
          {value || placeholder}
        </Text>
        <Clock size={20} color="#9CA3AF" />
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-5"
          onPress={() => setShowModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-5 w-full max-w-sm"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-shield-black">{'Select Time'}</Text>
              <Pressable onPress={() => setShowModal(false)} className="p-1">
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Time Picker */}
            <View className="flex-row justify-center items-center mb-6">
              {/* Hours */}
              <View className="items-center">
                <Pressable onPress={incrementHours} className="p-2">
                  <ChevronUp size={28} color="#374151" />
                </Pressable>
                <View className="bg-gray-100 rounded-xl px-6 py-4">
                  <Text className="text-3xl font-bold text-shield-black">
                    {String(selectedTime.hours).padStart(2, '0')}
                  </Text>
                </View>
                <Pressable onPress={decrementHours} className="p-2">
                  <ChevronDown size={28} color="#374151" />
                </Pressable>
              </View>

              {/* Separator */}
              <View className="mx-2 justify-center">
                <Text className="text-3xl font-bold text-shield-black">{':'}</Text>
              </View>

              {/* Minutes */}
              <View className="items-center">
                <Pressable onPress={incrementMinutes} className="p-2">
                  <ChevronUp size={28} color="#374151" />
                </Pressable>
                <View className="bg-gray-100 rounded-xl px-6 py-4">
                  <Text className="text-3xl font-bold text-shield-black">
                    {String(selectedTime.minutes).padStart(2, '0')}
                  </Text>
                </View>
                <Pressable onPress={decrementMinutes} className="p-2">
                  <ChevronDown size={28} color="#374151" />
                </Pressable>
              </View>

              {/* AM/PM */}
              <Pressable onPress={togglePeriod} className="ml-4">
                <View className="bg-shield-accent rounded-xl px-4 py-4">
                  <Text className="text-xl font-bold text-white">
                    {selectedTime.period}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Confirm Button */}
            <Pressable
              onPress={handleConfirm}
              className="bg-shield-accent rounded-full py-4"
            >
              <Text className="text-center text-white font-semibold text-base">
                {'Confirm'}
              </Text>
            </Pressable>

            {/* Clear button */}
            {value && (
              <Pressable
                onPress={() => {
                  onChange('');
                  setShowModal(false);
                }}
                className="mt-3 py-3"
              >
                <Text className="text-center text-gray-500 font-medium">{'Clear'}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
