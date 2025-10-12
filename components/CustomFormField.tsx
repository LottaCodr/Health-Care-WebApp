'use client';

import React, { useId, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { FormFieldType } from './forms/PatientForm';

import DatePicker from 'react-datepicker';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';

import 'react-phone-number-input/style.css';
import 'react-datepicker/dist/react-datepicker.css';

// Import react-icons
import { MdPerson, MdEmail, MdPhone, MdCalendarToday, MdWork, MdHome } from 'react-icons/md';
import { FaPrayingHands } from "react-icons/fa";

import { IconType } from 'react-icons';

const ICON_MAP: Record<string, IconType> = {
  '/assets/icons/user.svg': MdPerson,
  '/assets/icons/email.svg': MdEmail,
  '/assets/icons/phone.svg': MdPhone,
  '/assets/icons/calendar.svg': MdCalendarToday,
  '/assets/icons/religion.svg': FaPrayingHands,
  '/assets/icons/work.svg': MdWork,
  '/assets/icons/home.svg': MdHome,
};

const COMMON_CLASS =
  [
    'w-full',
    'rounded-xl',
    // 'dark:from-gray-900 dark:via-gray-950 dark:to-gray-900',
    'border border-gray-300 dark:border-gray-700',
    'px-5 py-3',
    'text-base',
    'focus:outline-none',
    'focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
    'hover:border-primary-500',
    'active:ring-2 active:ring-primary-400',
    'focus:shadow-lg',
    'placeholder-gray-400 dark:placeholder-gray-500',
    'disabled:bg-gray-100 dark:disabled:bg-gray-800',
    'disabled:cursor-not-allowed',
  ].join(' ')

const LABEL_CLASS =
  'text-[16px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 mb-2 tracking-wide';

const ERROR_CLASS =
  'text-xs text-red-600 mt-1 font-semibold';

const ICON_CLASS =
  'text-primary-400 dark:text-primary-300 ';

const FOCUS_RING =
  'focus:ring-2 focus:ring-primary-600 focus:border-primary-600';

const HOVER_RING =
  'hover:border-primary-500';

const ACTIVE_RING =
  'active:ring-2 active:ring-primary-400';

const DISABLED_CLASS =
  'opacity-50 pointer-events-none';

const FIELD_SHADOW =
  // 'shadow focus:shadow-lg transition-shadow'
  '';

interface CustomProps {
  control: any;
  fieldType: FormFieldType;
  name: string;
  label?: string;
  placeholder?: string;
  iconSrc?: string;
  iconAlt?: string;
  disabled?: boolean;
  dateFormat?: string;
  showTimeSelected?: boolean;
  children?: React.ReactNode;
  renderSkeleton?: (field: any) => React.ReactNode;
  description?: string;
  autoFocus?: boolean;
  required?: boolean;
}

const getIconComponent = (iconSrc?: string) => {
  if (!iconSrc) return null;
  const Icon = ICON_MAP[iconSrc];
  if (Icon) return <Icon size={22} className={ICON_CLASS + " opacity-80"} aria-hidden="true" />;
  return null;
};

const renderField = (field: any, props: CustomProps, inputId: string, fieldState: any, inputRef: any) => {
  const {
    fieldType,
    placeholder,
    iconSrc,
    iconAlt,
    disabled,
    children,
    showTimeSelected,
    dateFormat,
    renderSkeleton,
    autoFocus,
    required,
  } = props;

  const error = fieldState?.error;

  switch (fieldType) {
    case FormFieldType.INPUT:
      return (
        <div className="relative flex items-center group">
          {iconSrc && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              {getIconComponent(iconSrc)}
            </span>
          )}
          <FormControl>
            <Input
              {...field}
              id={inputId}
              ref={inputRef}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={
                [
                  COMMON_CLASS,
                  iconSrc ? 'pl-14' : '',
                  FOCUS_RING,
                  HOVER_RING,
                  ACTIVE_RING,
                  FIELD_SHADOW,
                  error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
                  disabled ? DISABLED_CLASS : '',
                  'transition-all',
                ].join(' ')
              }
              autoComplete="off"
              aria-describedby={props.description ? `${inputId}-desc` : undefined}
              aria-invalid={!!error}
              aria-required={required}
            />
          </FormControl>
        </div>
      );

    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <div className="relative flex items-center group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              {getIconComponent('/assets/icons/phone.svg')}
            </span>
            <Input
              {...field}
              id={inputId}
              ref={inputRef}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={[
                COMMON_CLASS,
                'pl-14',
                FOCUS_RING,
                HOVER_RING,
                ACTIVE_RING,
                FIELD_SHADOW,
                error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
                disabled ? DISABLED_CLASS : '',
                'transition-all',
              ].join(' ')}
              autoComplete="off"
              aria-label={props.label}
              aria-describedby={props.description ? `${inputId}-desc` : undefined}
              aria-invalid={!!error}
              aria-required={required}
              autoFocus={autoFocus}
              type="tel"
            />
          </div>
        </FormControl>
      );

    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <SelectTrigger
              className={[
                COMMON_CLASS,
                'cursor-pointer',
                FOCUS_RING,
                HOVER_RING,
                ACTIVE_RING,
                FIELD_SHADOW,
                error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
                disabled ? DISABLED_CLASS : '',
                'transition-all',
              ].join(' ')}
              id={inputId}
              aria-label={props.label}
              aria-invalid={!!error}
              aria-required={required}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 max-h-64 overflow-y-auto">
              {children}
            </SelectContent>
          </Select>
        </FormControl>
      );

    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            {...field}
            id={inputId}
            ref={inputRef}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={[
              COMMON_CLASS,
              'resize-none min-h-[120px] rounded-2xl',
              FOCUS_RING,
              HOVER_RING,
              ACTIVE_RING,
              FIELD_SHADOW,
              error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
              disabled ? DISABLED_CLASS : '',
              'transition-all',
            ].join(' ')}
            aria-describedby={props.description ? `${inputId}-desc` : undefined}
            autoComplete="off"
            aria-invalid={!!error}
            aria-required={required}
          />
        </FormControl>
      );

    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-center gap-3">
            <Checkbox
              id={inputId}
              checked={!!field.value}
              onCheckedChange={field.onChange}
              aria-checked={!!field.value}
              disabled={disabled}
              className={[
                'rounded border-gray-400 bg-white shadow-sm',
                FOCUS_RING,
                HOVER_RING,
                ACTIVE_RING,
                error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
                disabled ? DISABLED_CLASS : '',
                'transition',
              ].join(' ')}
              aria-invalid={!!error}
              aria-required={required}
            />
            <label
              htmlFor={inputId}
              className={LABEL_CLASS + " cursor-pointer"}
            >
              {props.label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </label>
          </div>
        </FormControl>
      );

    case FormFieldType.DATE_PICKER:
      return (
        <div className="relative flex items-center">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {getIconComponent('/assets/icons/calendar.svg')}
          </span>
          <FormControl>
            <DatePicker
              id={inputId}
              selected={field.value}
              onChange={(date) => field.onChange(date)}
              dateFormat={dateFormat || 'MM/dd/yyyy'}
              showTimeSelect={showTimeSelected}
              className={[
                COMMON_CLASS,
                'pl-14',
                FOCUS_RING,
                HOVER_RING,
                ACTIVE_RING,
                FIELD_SHADOW,
                error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '',
                disabled ? DISABLED_CLASS : '',
                'transition-all',
              ].join(' ')}
              placeholderText={placeholder}
              disabled={disabled}
              aria-label={props.label}
              aria-describedby={props.description ? `${inputId}-desc` : undefined}
              autoComplete="off"
              aria-invalid={!!error}
              aria-required={required}
            />
          </FormControl>
        </div>
      );

    case FormFieldType.SKELETON:
      return renderSkeleton ? renderSkeleton(field) : null;
    default:
      return null;
  }
};

const CustomFormField: React.FC<CustomProps> = (props) => {
  const { control, name, label, fieldType, description, autoFocus, required, disabled } = props;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel htmlFor={inputId} className={LABEL_CLASS}>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
              {disabled && (
                <span className="ml-2 text-xs text-gray-400 font-normal">(disabled)</span>
              )}
            </FormLabel>
          )}
          {description && (
            <div id={`${inputId}-desc`} className="text-xs text-gray-500 mb-1.5">
              {description}
            </div>
          )}
          {renderField(field, props, inputId, fieldState, inputRef)}
          <FormMessage className={ERROR_CLASS + " px-1"} />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
