import { StyleSheet, Text, TextInput, View } from 'react-native';

const colors = {
  field: '#0A1625',
  border: '#203149',
  text: '#EAF0FA',
  muted: '#91A1B8',
  placeholder: '#65768E',
  error: '#FF8A96',
};

export default function FormTextInput({
  autoCapitalize = 'none',
  autoComplete,
  error,
  hint,
  keyboardType = 'default',
  label,
  maxLength,
  onChangeText,
  placeholder,
  returnKeyType = 'done',
  value,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityHint={error ? `${hint} ${error}` : hint}
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        returnKeyType={returnKeyType}
        selectionColor="#80A8FF"
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  label: {
    color: '#AFBDD0',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.field,
    color: colors.text,
    fontSize: 13,
  },
  inputError: {
    borderColor: '#A64E60',
  },
  error: {
    color: colors.error,
    fontSize: 10,
    lineHeight: 14,
  },
});
