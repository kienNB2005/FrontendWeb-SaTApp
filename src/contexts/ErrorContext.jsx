import React, { createContext, useContext, useState, useCallback } from 'react';
import ErrorModal from '../components/ErrorModal';

const ErrorContext = createContext({
  showError: () => {},
});

export const useError = () => useContext(ErrorContext);

export const ErrorProvider = ({ children }) => {
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const showError = useCallback((message) => {
    setErrorModal({ isOpen: true, message });
  }, []);

  const closeError = useCallback(() => {
    setErrorModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={closeError}
      />
    </ErrorContext.Provider>
  );
};
