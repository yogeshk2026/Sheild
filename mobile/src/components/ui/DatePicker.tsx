import React, { useState } from 'react';
import { View, Pressable, Modal, Platform } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { Text } from './Text';
import * as Haptics from 'expo-haptics';
import { normalizeDate } from '@/lib/ticketScanning';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: object;
  required?: boolean;
  getRequiredFieldBorderColor?: (value: string) => string;
  minimumDate?: Date;
  maximumDate?: Date;
}

// Min and max dates for the picker (1920-2050)
const MIN_DATE = new Date(1920, 0, 1);
const MAX_DATE = new Date(2050, 11, 31);

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Format date for display: "Today", "Tomorrow", or "Monday, January 22, 2026"
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';

  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;

  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);

  // Check if it's today or tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateToCheck = new Date(year, month, day);
  dateToCheck.setHours(0, 0, 0, 0);

  if (dateToCheck.getTime() === today.getTime()) {
    return 'Today';
  }

  if (dateToCheck.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  // Format as "Monday, January 22, 2026"
  const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
  const monthName = MONTHS[date.getMonth()];
  return `${dayOfWeek}, ${monthName} ${day}, ${year}`;
};

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select Date',
  style,
  required = false,
  getRequiredFieldBorderColor,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Parse existing value or use current date
  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(2000, 0, 1); // Default to Jan 1, 2000 for birthdays
    const normalized = normalizeDate(dateStr) || dateStr;
    const parts = normalized.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(2000, 0, 1);
  };

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const initialDate = value ? parseDate(value) : new Date(2000, 0, 1);
    setTempDate(initialDate);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        display: 'default',
        minimumDate: minimumDate || MIN_DATE,
        maximumDate: maximumDate || MAX_DATE,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onChange(formatDate(selectedDate));
          }
        },
      });
      return;
    }

    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // iOS - update temp date as user scrolls
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(formatDate(tempDate));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  const handleClear = () => {
    onChange('');
    setShowPicker(false);
  };

  const borderColor = required && getRequiredFieldBorderColor
    ? getRequiredFieldBorderColor(value)
    : '#E5E7EB';

  const displayValue = value ? formatDisplayDate(value) : placeholder;

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
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <View style={{ position: 'absolute', left: 16 }}>
          <Calendar size={20} color="#9CA3AF" />
        </View>
        <Text
          style={{
            fontSize: 16,
            color: value ? '#000000' : '#9CA3AF',
            textAlign: 'center',
          }}
        >
          {displayValue}
        </Text>
      </Pressable>

      {/* iOS - Modal with picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={handleCancel}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB'
                }}>
                  <Pressable onPress={handleCancel}>
                    <Text style={{ color: '#6B7280', fontSize: 16 }}>{'Cancel'}</Text>
                  </Pressable>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#000000' }}>{'Select Date'}</Text>
                  <Pressable onPress={handleConfirm}>
                    <Text style={{ color: '#F97316', fontSize: 16, fontWeight: '600' }}>{'Done'}</Text>
                  </Pressable>
                </View>

                {/* Native Date Picker - Centered */}
                <View style={{ alignItems: 'center' }}>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleChange}
                    minimumDate={minimumDate || MIN_DATE}
                    maximumDate={maximumDate || MAX_DATE}
                    style={{ height: 200, width: '100%', backgroundColor: '#FFFFFF' }}
                    textColor="#000000"
                    themeVariant="light"
                  />
                </View>

                {/* Clear button */}
                {value && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
                    <Pressable
                      onPress={handleClear}
                      style={{
                        paddingVertical: 14,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '500' }}>{'Clear Date'}</Text>
                    </Pressable>
                  </View>
                )}

                {!value && <View style={{ height: 30 }} />}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
