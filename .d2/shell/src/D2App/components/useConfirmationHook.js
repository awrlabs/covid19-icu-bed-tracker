import React from 'react';
export default function useConfirmation() {
  const show = (query, onOk, onCancel) => {
    const isOk = confirm(query);

    if (isOk) {
      onOk();
    } else {
      onCancel();
    }
  };

  return {
    show
  };
}