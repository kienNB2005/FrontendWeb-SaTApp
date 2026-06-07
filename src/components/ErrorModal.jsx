import React from 'react';
import '../css/ErrorModal.css';

export default function ErrorModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="error-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div className="error-modal-content">
        <div className="error-modal-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f27474"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h2 id="error-modal-title" className="error-modal-heading">Đã xảy ra lỗi</h2>
        <p className="error-modal-message">{message}</p>
        <button
          className="error-modal-btn"
          onClick={onClose}
          aria-label="Đóng hộp thoại báo lỗi"
        >
          OK
        </button>
      </div>
    </div>
  );
}
