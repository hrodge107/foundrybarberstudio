import React, { useState, useEffect, useRef } from 'react';

// --- CUSTOM TEXT INPUT ---
interface CustomTextInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const CustomTextInput: React.FC<CustomTextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  icon,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const actualType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', gap: '4px' }}>
        <span>{label}</span>
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: disabled ? '#f8fafc' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${error ? '#ef4444' : isFocused ? '#18181b' : '#cbd5e1'}`,
          boxShadow: isFocused && !disabled ? '0 0 0 3px rgba(24, 24, 27, 0.08)' : 'none',
          transition: 'all 0.15s ease-in-out',
          opacity: disabled ? 0.75 : 1,
        }}
      >
        {icon && (
          <div style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
            {icon}
          </div>
        )}
        <input
          type={actualType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: '100%',
            padding: icon ? '10px 12px 10px 8px' : '10px 12px',
            paddingRight: type === 'password' ? '40px' : '12px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.9rem',
            color: '#1e293b',
            borderRadius: '8px',
            fontFamily: 'inherit',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
    </div>
  );
};


// --- CUSTOM TIME SELECT ---
interface CustomTimeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minTime?: string; // HH:mm format
}

export const CustomTimeSelect: React.FC<CustomTimeSelectProps> = ({
  label,
  value,
  onChange,
  required = false,
  minTime,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate 15-minute intervals from 06:00 to 23:00
  const timeSlots: { raw: string; label: string }[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let min of [0, 15, 30, 45]) {
      if (hour === 23 && min > 0) break; // cap at 23:00
      const hStr = hour.toString().padStart(2, '0');
      const mStr = min.toString().padStart(2, '0');
      const raw = `${hStr}:${mStr}`;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const displayLabel = `${displayHour}:${mStr} ${ampm}`;
      timeSlots.push({ raw, label: displayLabel });
    }
  }

  const selectedRaw = value.slice(0, 5);
  const currentSlot = timeSlots.find((s) => s.raw === selectedRaw) || {
    raw: selectedRaw,
    label: selectedRaw,
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', gap: '4px' }}>
        <span>{label}</span>
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 12px',
          background: '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? '#18181b' : '#cbd5e1'}`,
          boxShadow: isOpen ? '0 0 0 3px rgba(24, 24, 27, 0.08)' : 'none',
          transition: 'all 0.15s ease-in-out',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          color: '#1e293b',
          fontWeight: 500,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{currentSlot.label}</span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            padding: '4px',
            scrollbarWidth: 'thin',
          }}
        >
          {timeSlots.map((slot) => {
            const isSelected = slot.raw === selectedRaw;
            const isDisabled = Boolean(minTime && slot.raw < minTime);
            return (
              <div
                key={slot.raw}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(slot.raw);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 400,
                  background: isSelected ? '#18181b' : 'transparent',
                  color: isDisabled ? '#cbd5e1' : isSelected ? '#ffffff' : '#27272a',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.1s ease',
                  textDecoration: isDisabled ? 'line-through' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !isDisabled) (e.currentTarget as HTMLElement).style.background = '#f4f4f5';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !isDisabled) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {slot.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


// --- CUSTOM DAY PICKER ---
interface CustomDayPickerProps {
  label: string;
  allDays: string[];
  selectedDays: string[];
  onToggleDay: (day: string) => void;
  required?: boolean;
}

export const CustomDayPicker: React.FC<CustomDayPickerProps> = ({
  label,
  allDays,
  selectedDays,
  onToggleDay,
  required = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', gap: '4px' }}>
        <span>{label}</span>
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {allDays.map((day) => {
          const selected = selectedDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggleDay(day)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: selected ? '1px solid #18181b' : '1px solid #e4e4e7',
                background: selected ? '#18181b' : '#fafafa',
                color: selected ? '#ffffff' : '#71717a',
                fontWeight: selected ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: selected ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none',
              }}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


// --- CUSTOM IMAGE UPLOADER (MAX 1MB) ---
interface CustomImageUploaderProps {
  label: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  onError: (msg: string) => void;
  barberName?: string;
}

export const CustomImageUploader: React.FC<CustomImageUploaderProps> = ({
  label,
  imageUrl,
  onImageChange,
  onError,
  barberName,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      onError('Image file size exceeds limit! Maximum allowed size is 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        onImageChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const initial = barberName ? barberName.charAt(0).toUpperCase() : 'B';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>{label}</label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '14px',
          borderRadius: '10px',
          background: isDragging ? '#f4f4f5' : '#fafafa',
          border: `2px dashed ${isDragging ? '#18181b' : '#e4e4e7'}`,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#18181b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            flexShrink: 0,
            border: '1px solid #27272a',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Barber avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
            {imageUrl ? 'Barber Photo Attached' : 'Upload Barber Avatar'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Drag and drop or select file. <strong>Max size: 1 MB</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <label
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{imageUrl ? 'Change Photo' : 'Choose Image'}</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>

            {imageUrl && (
              <button
                type="button"
                onClick={() => onImageChange('')}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- CUSTOM DATE PICKER ---
interface CustomDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  minDate?: string; // YYYY-MM-DD format
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  minDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState<Date>(selectedDate);

  useEffect(() => {
    if (value) {
      setViewDate(new Date(`${value}T00:00:00`));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const yStr = year.toString();
    const mStr = (month + 1).toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  const isSelectedDay = (day: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', gap: '4px' }}>
        <span>{label}</span>
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 12px',
          background: '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? '#18181b' : '#cbd5e1'}`,
          boxShadow: isOpen ? '0 0 0 3px rgba(24, 24, 27, 0.08)' : 'none',
          transition: 'all 0.15s ease-in-out',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          color: '#1e293b',
          fontWeight: 500,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{displayLabel}</span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '280px',
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            padding: '12px',
          }}
        >
          {/* Calendar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              &lt;
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#18181b' }}>{monthLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              &gt;
            </button>
          </div>

          {/* Weekday Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const active = isSelectedDay(dayNum);
              const yStr = year.toString();
              const mStr = (month + 1).toString().padStart(2, '0');
              const dStr = dayNum.toString().padStart(2, '0');
              const cellDateStr = `${yStr}-${mStr}-${dStr}`;
              const isDisabled = Boolean(minDate && cellDateStr < minDate);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => {
                    if (isDisabled) return;
                    handleSelectDay(dayNum);
                  }}
                  style={{
                    padding: '6px 0',
                    border: 'none',
                    borderRadius: '6px',
                    background: active ? '#18181b' : 'transparent',
                    color: isDisabled ? '#cbd5e1' : active ? '#ffffff' : '#27272a',
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 400,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.1s ease',
                    textDecoration: isDisabled ? 'line-through' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active && !isDisabled) (e.currentTarget as HTMLElement).style.background = '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    if (!active && !isDisabled) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- CUSTOM TEXT AREA ---
interface CustomTextAreaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export const CustomTextArea: React.FC<CustomTextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'flex', gap: '4px' }}>
        <span>{label}</span>
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1px solid ${error ? '#ef4444' : isFocused ? '#18181b' : '#cbd5e1'}`,
          boxShadow: isFocused && !disabled ? '0 0 0 3px rgba(24, 24, 27, 0.08)' : 'none',
          background: disabled ? '#f8fafc' : '#ffffff',
          fontSize: '0.9rem',
          color: '#1e293b',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          transition: 'all 0.15s ease-in-out',
          opacity: disabled ? 0.75 : 1,
          boxSizing: 'border-box',
        }}
      />
      {error && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{error}</span>}
    </div>
  );
};
