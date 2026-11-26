const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRegistration({ surname, email, dateOfBirth }) {
  const errors = {};
  const trimmedSurname = surname.trim();
  const trimmedEmail = email.trim();

  if (!trimmedSurname) {
    errors.surname = 'Enter your surname.';
  } else if (trimmedSurname.length > 80) {
    errors.surname = 'Surname must be 80 characters or fewer.';
  }

  if (!emailPattern.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!(dateOfBirth instanceof Date) || Number.isNaN(dateOfBirth.getTime())) {
    errors.dateOfBirth = 'Select your date of birth.';
  } else {
    const selectedDate = new Date(dateOfBirth);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) errors.dateOfBirth = 'Date of birth cannot be in the future.';
  }

  return errors;
}
