'use client';

import React, { useId, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from './ui/form';
import { FormFieldType } from './forms/PatientForm';
import DatePicker from 'react-datepicker';
import { Select, SelectContent, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import 'react-phone-number-input/style.css';
import 'react-datepicker/dist/react-datepicker.css';
import { MdPerson, MdEmail, MdPhone, MdCalendarToday, MdWork, MdHome } from 'react-icons/md';
import { FaPrayingHands } from 'react-icons/fa';
import { AlertCircle } from 'lucide-react';
import { IconType } from 'react-icons';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fmtDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, IconType> = {
  '/assets/icons/user.svg': MdPerson,
  '/assets/icons/email.svg': MdEmail,
  '/assets/icons/phone.svg': MdPhone,
  '/assets/icons/calendar.svg': MdCalendarToday,
  '/assets/icons/religion.svg': FaPrayingHands,
  '/assets/icons/work.svg': MdWork,
  '/assets/icons/home.svg': MdHome,
};

// ─── Style constants ──────────────────────────────────────────────────────────

// Base input — clean white, rounded-xl, consistent height, subtle border
const INPUT_BASE = [
  'w-full h-11 rounded-xl',
  'bg-gray-50 border border-gray-200',
  'text-sm text-gray-800 font-medium',
  'placeholder:text-gray-300',
  'transition-all duration-150',
  'focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 focus:bg-white',
  'hover:border-gray-300 hover:bg-white',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
].join(' ');

const INPUT_ERROR = 'border-red-300 bg-red-50 focus:ring-red-400/30 focus:border-red-400';

const LABEL_BASE = 'text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getIcon = (iconSrc?: string) => {
  if (!iconSrc) return null;
  const Icon = ICON_MAP[iconSrc];
  return Icon ? <Icon size={16} className="text-gray-400" aria-hidden="true" /> : null;
};

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Field renderer ───────────────────────────────────────────────────────────

const renderField = (
  field: any,
  props: CustomProps,
  inputId: string,
  fieldState: any,
  inputRef: any,
) => {
  const {
    fieldType, placeholder, iconSrc, disabled,
    children, showTimeSelected, dateFormat,
    renderSkeleton, autoFocus, required,
  } = props;

  const hasError = !!fieldState?.error;

  switch (fieldType) {

    case FormFieldType.INPUT:
      return (
        <div className="relative flex items-center">
          {iconSrc && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {getIcon(iconSrc)}
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
              autoComplete="off"
              aria-invalid={hasError}
              aria-required={required}
              className={[
                INPUT_BASE,
                iconSrc ? 'pl-10' : 'px-4',
                hasError ? INPUT_ERROR : '',
              ].join(' ')}
            />
          </FormControl>
        </div>
      );

    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <MdPhone size={16} className="text-gray-400" />
            </span>
            <Input
              {...field}
              id={inputId}
              ref={inputRef}
              type="tel"
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              autoComplete="off"
              aria-invalid={hasError}
              aria-required={required}
              autoFocus={autoFocus}
              className={[
                INPUT_BASE,
                'pl-10',
                hasError ? INPUT_ERROR : '',
              ].join(' ')}
            />
          </div>
        </FormControl>
      );

    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
            <SelectTrigger
              id={inputId}
              aria-invalid={hasError}
              aria-required={required}
              className={[
                INPUT_BASE,
                'px-4 cursor-pointer',
                hasError ? INPUT_ERROR : '',
              ].join(' ')}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl bg-white border border-gray-100 max-h-60 overflow-y-auto">
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
            autoComplete="off"
            aria-invalid={hasError}
            aria-required={required}
            className={[
              'w-full rounded-xl min-h-[110px] resize-none',
              'bg-gray-50 border border-gray-200',
              'text-sm text-gray-800 font-medium px-4 py-3',
              'placeholder:text-gray-300',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 focus:bg-white',
              'hover:border-gray-300 hover:bg-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              hasError ? INPUT_ERROR : '',
            ].join(' ')}
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
              disabled={disabled}
              aria-invalid={hasError}
              aria-required={required}
              className={[
                'w-5 h-5 rounded-lg border-gray-300 transition-colors',
                'data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
                hasError ? 'border-red-400' : '',
              ].join(' ')}
            />
            <label htmlFor={inputId} className="text-sm font-semibold text-gray-700 cursor-pointer select-none leading-tight">
              {props.label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </label>
          </div>
        </FormControl>
      );

    case FormFieldType.DATE_PICKER:
      return (
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <button type="button" className={[
                INPUT_BASE, 'px-4 flex items-center gap-3 text-left',
                !field.value ? 'text-gray-300' : 'text-gray-800',
                hasError ? INPUT_ERROR : '',
              ].join(' ')}>
                <CalendarIcon size={15} className="text-gray-400 shrink-0" />
                {field.value ? fmtDate(field.value) : <span>{placeholder ?? 'Pick a date'}</span>}
              </button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border border-gray-100" align="start">
            <Calendar
              mode="single"
              selected={field.value instanceof Date ? field.value : field.value ? new Date(field.value) : undefined}
              onSelect={(date) => {
                if (date) {
                  field.onChange(date);
                }
              }}
              disabled={disabled}
              initialFocus
              captionLayout="dropdown"
              fromYear={1900}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
      );

    case FormFieldType.SKELETON:
      return renderSkeleton ? renderSkeleton(field) : null;

    default:
      return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const CustomFormField: React.FC<CustomProps> = (props) => {
  const { control, name, label, fieldType, description, autoFocus, required, disabled } = props;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = !!fieldState?.error;
        return (
          <FormItem className="w-full space-y-0">

            {/* Label — skip for checkbox (it renders its own) */}
            {fieldType !== FormFieldType.CHECKBOX && label && (
              <FormLabel htmlFor={inputId} className={LABEL_BASE}>
                {label}
                {required && <span className="text-red-500">*</span>}
                {disabled && <span className="text-gray-300 normal-case font-normal tracking-normal">(disabled)</span>}
              </FormLabel>
            )}

            {/* Description */}
            {description && (
              <p id={`${inputId}-desc`} className="text-[10px] text-gray-400 mb-2">
                {description}
              </p>
            )}

            {/* Input */}
            {renderField(field, props, inputId, fieldState, inputRef)}

            {/* Error */}
            {hasError && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertCircle size={10} className="text-red-500 shrink-0" />
                <FormMessage className="text-[10px] text-red-500 font-semibold" />
              </div>
            )}
          </FormItem>
        );
      }}
    />
  );
};

export default CustomFormField;