import React, { useRef } from 'react';

type Props = {
  onChange?: (files: string[]) => void;
};

const PhotoCapture: React.FC<Props> = ({ onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = () => {
    const input = inputRef.current; if (!input || !input.files) return;
    const arr: string[] = [];
    Array.from(input.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          arr.push(reader.result);
          if (arr.length === input.files!.length && onChange) onChange(arr);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFiles} />
      <div style={{ marginTop: 8 }}>
        <small className="text-muted">Puedes tomar varias fotos desde el móvil.</small>
      </div>
    </div>
  );
};

export default PhotoCapture;
