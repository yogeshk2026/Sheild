import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { cn } from '@/lib/cn';

type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';

interface TextProps extends RNTextProps {
  className?: string;
  weight?: FontWeight;
}

const fontFamilyMap: Record<FontWeight, string> = {
  normal: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semibold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extrabold: 'NunitoSans_800ExtraBold',
};

export function Text({ className, weight = 'normal', style, ...props }: TextProps) {
  // Detect font weight from className to auto-select the right font
  let selectedWeight = weight;
  if (className) {
    if (className.includes('font-extrabold')) {
      selectedWeight = 'extrabold';
    } else if (className.includes('font-bold')) {
      selectedWeight = 'bold';
    } else if (className.includes('font-semibold')) {
      selectedWeight = 'semibold';
    } else if (className.includes('font-medium')) {
      selectedWeight = 'medium';
    }
  }

  return (
    <RNText
      className={cn(className)}
      style={[{ fontFamily: fontFamilyMap[selectedWeight] }, style]}
      {...props}
    />
  );
}
