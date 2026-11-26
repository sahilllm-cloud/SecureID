import { useState } from 'react';
import {
  DateTimePickerAndroid,
  default as DateTimePicker,
} from '@react-native-community/datetimepicker';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const colors = {
  surface: '#0A1625',
  border: '#203149',
  text: '#EAF0FA',
  muted: '#91A1B8',
  blue: '#83ABF4',
  error: '#FF8A96',
};

function formatDate(value) {
  if (!value) return '';
  return value.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DateOfBirthField({ error, onChange, value }) {
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const pickerValue = value || new Date(2000, 0, 1);

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        display: 'default',
        maximumDate: new Date(),
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) onChange(selectedDate);
        },
      });
      return;
    }
    setIosPickerVisible(true);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date of birth</Text>
      <Pressable
        accessibilityHint="Opens the native date picker."
        accessibilityLabel={value ? `Date of birth, ${formatDate(value)}` : 'Date of birth'}
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.input,
          error ? styles.inputError : null,
          pressed ? styles.inputPressed : null,
        ]}
      >
        <Text style={[styles.dateText, !value ? styles.placeholder : null]}>
          {value ? formatDate(value) : 'Select your date of birth'}
        </Text>
        <View style={styles.calendarMark}>
          <View style={styles.calendarLine} />
          <Text style={styles.calendarDay}>31</Text>
        </View>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIosPickerVisible(false)}
          transparent
          visible={iosPickerVisible}
        >
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityLabel="Close date picker"
              onPress={() => setIosPickerVisible(false)}
              style={styles.modalBackdrop}
            />
            <View style={styles.dateSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Date of birth</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIosPickerVisible(false)}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                display="spinner"
                maximumDate={new Date()}
                mode="date"
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) onChange(selectedDate);
                }}
                textColor={colors.text}
                value={pickerValue}
              />
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 13,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  inputPressed: {
    borderColor: '#3A5D91',
  },
  inputError: {
    borderColor: '#A64E60',
  },
  dateText: {
    color: colors.text,
    fontSize: 12,
  },
  placeholder: {
    color: '#65768E',
  },
  calendarMark: {
    width: 22,
    height: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A5272',
    borderRadius: 6,
  },
  calendarLine: {
    width: 20,
    height: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#3A5272',
  },
  calendarDay: {
    marginTop: 1,
    color: colors.blue,
    fontSize: 8,
    fontWeight: '700',
  },
  error: {
    color: colors.error,
    fontSize: 10,
    lineHeight: 14,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 8, 17, 0.72)',
  },
  dateSheet: {
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#101E31',
  },
  sheetHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2B3D55',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  doneText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
});
