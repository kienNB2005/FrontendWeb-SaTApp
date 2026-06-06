import { createContext, useContext, useState } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({ message: '', confirmText: 'Xác nhận', cancelText: 'Hủy' });
  const [resolvePromise, setResolvePromise] = useState(null);

  const confirm = (message, confirmText = 'Xác nhận', cancelText = 'Hủy') => {
    return new Promise((resolve) => {
      setOptions({ message, confirmText, cancelText });
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--tx)' }}>Xác nhận</h3>
            <p style={{ marginBottom: '24px', color: 'var(--tx)', fontSize: '14px', lineHeight: '1.5' }}>{options.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-s" onClick={handleCancel}>{options.cancelText}</button>
              <button className="btn btn-p" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={handleConfirm}>{options.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
