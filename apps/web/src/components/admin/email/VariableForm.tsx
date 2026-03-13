'use client';

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useToast } from '../shared/ToastContext';

interface FieldConfig {
  name: string;
  label: string;
  type: 'string' | 'email' | 'number' | 'date' | 'boolean' | 'url';
  required: boolean;
}

interface VariableFormProps {
  templateKey: string;
  requiredVars: string[];
  optionalVars: string[];
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  submitButtonLabel?: string;
  loading?: boolean;
}

/**
 * Dynamic form generator for email template variables
 * Supports multiple field types with validation
 */
export function VariableForm({
  templateKey,
  requiredVars,
  optionalVars,
  onSubmit,
  submitButtonLabel = 'Generate Preview',
  loading = false,
}: VariableFormProps) {
  const { showToast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allVars = [...requiredVars, ...optionalVars];

  const getFieldConfig = (varName: string): FieldConfig => {
    const isRequired = requiredVars.includes(varName);
    const label = varName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    let type: FieldConfig['type'] = 'string';
    if (varName.includes('email')) type = 'email';
    else if (varName.includes('date')) type = 'date';
    else if (varName.includes('count') || varName.includes('number')) type = 'number';
    else if (varName.includes('url') || varName.includes('link')) type = 'url';
    else if (varName.includes('is') || varName.includes('has')) type = 'boolean';

    return {
      name: varName,
      label,
      type,
      required: isRequired,
    };
  };

  const validateField = (field: FieldConfig, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

    if (!value) return null;

    switch (field.type) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email address`;
        }
        break;
      }
      case 'url': {
        try {
          new URL(value);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;
      }
      case 'number': {
        const num = parseFloat(value);
        if (isNaN(num)) {
          return `${field.label} must be a valid number`;
        }
        break;
      }
      case 'date': {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return `${field.label} must be a valid date`;
        }
        break;
      }
    }

    return null;
  };

  const handleInputChange = useCallback((varName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [varName]: value }));
    const field = getFieldConfig(varName);
    const error = validateField(field, value);
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[varName] = error;
      } else {
        delete newErrors[varName];
      }
      return newErrors;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    for (const varName of requiredVars) {
      const field = getFieldConfig(varName);
      const error = validateField(field, formValues[varName]);
      if (error) {
        newErrors[varName] = error;
      }
    }

    // Validate optional fields if they have values
    for (const varName of optionalVars) {
      if (formValues[varName]) {
        const field = getFieldConfig(varName);
        const error = validateField(field, formValues[varName]);
        if (error) {
          newErrors[varName] = error;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('error', 'Validation Error', 'Please fix the errors below');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formValues);
    } catch (error) {
      console.error('Form submission error:', error);
      showToast('error', 'Submission Error', 'Failed to process form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formValues[field.name] ?? '';
    const error = errors[field.name];
    const isInvalid = !!error;

    const baseInputClasses =
      'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';
    const inputClasses = isInvalid
      ? `${baseInputClasses} border-red-300 bg-red-50`
      : `${baseInputClasses} border-gray-300`;

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.name} className="flex items-center gap-3">
            <input
              id={field.name}
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              disabled={isSubmitting || loading}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <label htmlFor={field.name} className="text-sm text-gray-700 cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              id={field.name}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isSubmitting || loading}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className={inputClasses}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              id={field.name}
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isSubmitting || loading}
              className={inputClasses}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'email':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              id={field.name}
              type="email"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isSubmitting || loading}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className={inputClasses}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'url':
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              id={field.name}
              type="url"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isSubmitting || loading}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className={inputClasses}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </label>
            <input
              id={field.name}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isSubmitting || loading}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className={inputClasses}
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          </div>
        );
    }
  };

  if (allVars.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700"
      >
        This template has no variables to configure.
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Required Fields */}
      {requiredVars.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-red-600">●</span> Required Fields
          </h3>
          <div className="space-y-4">{requiredVars.map((varName) => renderField(getFieldConfig(varName)))}</div>
        </div>
      )}

      {/* Optional Fields */}
      {optionalVars.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-gray-400">●</span> Optional Fields
          </h3>
          <div className="space-y-4">{optionalVars.map((varName) => renderField(getFieldConfig(varName)))}</div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          {(isSubmitting || loading) && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {submitButtonLabel}
        </button>
      </div>
    </motion.form>
  );
}
