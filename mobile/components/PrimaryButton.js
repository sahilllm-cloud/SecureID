import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

export default function PrimaryButton({ disabled = false, label, loading = false, onPress }) {
  return (
    <Pressable
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && !loading ? styles.pressed : null,
        disabled || loading ? styles.disabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
      <Text style={styles.label}>{label}</Text>
      {!loading ? (
        <Text accessibilityElementsHidden style={styles.arrow}>
          →
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    borderRadius: 11,
    backgroundColor: '#3878E6',
    shadowColor: '#2C6DDB',
    shadowOpacity: 0.28,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  pressed: {
    backgroundColor: '#2F69CD',
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.64,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  arrow: {
    color: '#DCE8FF',
    fontSize: 17,
    marginTop: -1,
  },
});
