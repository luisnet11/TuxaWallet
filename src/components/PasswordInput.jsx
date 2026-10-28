import { useState } from 'react';

export default function PasswordInput({ label, value, onChange, placeholder, isValid }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-white placeholder-gray-500 ${
            value.length > 0
              ? isValid
                ? 'border-green-500 focus:ring-green-500'
                : 'border-red-500 focus:ring-red-500'
              : 'border-gray-700 focus:ring-purple-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {showPassword ? 'Ocultar' : 'Ver'}
        </button>
      </div>
    </div>
  );
}
