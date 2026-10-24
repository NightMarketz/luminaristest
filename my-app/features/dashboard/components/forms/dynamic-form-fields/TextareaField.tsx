import React from 'react';

interface TextareaFieldProps {
  name: string;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  className: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

function TextareaField({ name, value, onChange, className, required, readOnly, disabled, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy }: TextareaFieldProps) {
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(name, event.target.value);
  }

  return (
    <textarea
      id={name}
      name={name}
      value={value != null ? String(value) : ''}
      onChange={handleChange}
      className={className}
      required={required}
      readOnly={readOnly}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      rows={6}
    />
  );
}

export default TextareaField;
