import s from "./ApiKeyInput.module.scss";

export interface ApiKeyInputProps {
  showNCharacters?: number;
  value: string;
  placeholder: string;
  error: string | null;
  onChange: (newValue: string) => void;
}
import React, { useState, useRef, useEffect } from "react";

export const ApiKeyInput = ({
  value,
  onChange,
  placeholder,
  showNCharacters = 0,
  error,
}: ApiKeyInputProps) => {
  const [password, setPassword] = useState(value);
  const [scrollPosition, setScrollPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPassword(value);
  }, [value]);

  useEffect(
    () => () => {
      setPassword((p) => {
        onChange(p);
        return p;
      });
    },
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleScroll = () => {
    if (inputRef.current) {
      setScrollPosition(inputRef.current.scrollLeft);
    }
  };

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.scrollLeft = scrollPosition;
    }
  }, [scrollPosition]);

  const displayValue =
    password.length > showNCharacters
      ? `${password.slice(0, 3)}${"*".repeat(
          password.length - showNCharacters
        )}`
      : password;

  return (
    <div>
      <div className={s.apiKeyInput}>
        <input
          // w-full px-3 py-2 border rounded-md pr-12 font-mono text-transparent bg-transparent selection:bg-blue-200
          className={s.inputElement}
          ref={inputRef}
          type="text"
          value={password}
          onChange={handleChange}
          onScroll={handleScroll}
          placeholder={placeholder}
          style={{ caretColor: "black" }}
          onBlur={() => {
            onChange(password);
          }}
        />
        <div
          ref={overlayRef}
          className={s.overlay}
          // className="absolute inset-y-0 left-0 right-0 flex items-center px-3 pointer-events-none overflow-hidden"
        >
          <span
            // className="font-mono text-gray-700 whitespace-pre"
            className={s.overlayText}
          >
            {displayValue}
          </span>
        </div>
      </div>

      {error && <p className={s.error}>{error}</p>}
    </div>
  );
};
