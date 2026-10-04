import { useCallback, useState } from 'react';

/**
 * Form state plus the server's field errors.
 *
 * The server is the validator — the admin does not duplicate its rules — so
 * `submit` runs the request and, on a 422, spreads the returned `errors`
 * over the fields they belong to.
 */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const set = useCallback(
    (key) => (eventOrValue) => {
      const value =
        eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue
          ? eventOrValue.target.type === 'checkbox'
            ? eventOrValue.target.checked
            : eventOrValue.target.value
          : eventOrValue;
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    },
    []
  );

  const submit = useCallback(async (action) => {
    setSaving(true);
    setFormError(null);
    setErrors({});
    try {
      return await action();
    } catch (error) {
      if (error.errors && typeof error.errors === 'object') setErrors(error.errors);
      setFormError(error.message);
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    values,
    setValues,
    set,
    errors,
    setErrors,
    saving,
    formError,
    submit,
    reset: () => setValues(initial),
  };
}

export default useForm;
