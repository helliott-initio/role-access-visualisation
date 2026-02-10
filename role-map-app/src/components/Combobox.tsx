import { useState, useRef, useEffect } from 'react';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  allowCustom = true,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value with selected value
  useEffect(() => {
    const selected = options.find(o => o.value === value);
    setInputValue(selected?.label || value || '');
  }, [value, options]);

  // Filter options based on input
  useEffect(() => {
    const filtered = options.filter(o =>
      o.label.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [inputValue, options]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    if (allowCustom) {
      onChange(newValue);
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="combobox-wrapper" ref={wrapperRef}>
      <div className="combobox-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="combobox-input"
          autoComplete="off"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        {inputValue && (
          <button
            type="button"
            className="combobox-clear"
            onClick={handleClear}
            title="Clear"
          >
            &times;
          </button>
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="combobox-dropdown">
          {filteredOptions.map(option => (
            <li
              key={option.value}
              className={`combobox-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface MultiComboboxProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiCombobox({
  options,
  values,
  onChange,
  placeholder = 'Type to add...',
}: MultiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on input and exclude already selected
  useEffect(() => {
    const filtered = options.filter(o =>
      o.label.toLowerCase().includes(inputValue.toLowerCase()) &&
      !values.includes(o.value)
    );
    setFilteredOptions(filtered);
  }, [inputValue, options, values]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: ComboboxOption) => {
    onChange([...values, option.value]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const getLabel = (val: string) => {
    return options.find(o => o.value === val)?.label || val;
  };

  return (
    <div className="combobox-wrapper" ref={wrapperRef}>
      <div className="multi-combobox-container">
        {values.map(val => (
          <span key={val} className="combobox-tag">
            {getLabel(val)}
            <button
              type="button"
              className="combobox-tag-remove"
              onClick={() => handleRemove(val)}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="combobox-input-inline"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={values.length === 0 ? placeholder : ''}
        />
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="combobox-dropdown">
          {filteredOptions.map(option => (
            <li
              key={option.value}
              className="combobox-option"
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
