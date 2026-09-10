export const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    if (key === 'ea_auth_user' && !localStorage.getItem('ea_access_token')) {
      return null as T;
    }
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Error loading key "${key}" from localStorage:`, err);
    return fallback;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    if (key === 'ea_auth_user' && value == null) {
      localStorage.removeItem(key);
      localStorage.removeItem('ea_access_token');
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error saving key "${key}" to localStorage:`, err);
  }
};
