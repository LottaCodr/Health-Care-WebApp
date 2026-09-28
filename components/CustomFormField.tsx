'use client';

import React, { useId, useRef, useEffect, useState } from 'react';
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";


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
  renderSkeleton?: (field: any, inputId: string) => React.ReactNode;
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
  inputRef: React.RefObject<HTMLInputElement | null>,
  onDateSelected: () => void,
  dateOpen: boolean,
  setDateOpen: (open: boolean) => void,
) => {
  const {
    fieldType, placeholder, iconSrc, disabled,
    children, showTimeSelected, dateFormat,
    renderSkeleton, autoFocus, required,
  } = props;

  const hasError = !!fieldState?.error;
  const descriptionId = props.description ? `${inputId}-desc` : undefined;
  const setInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    field.ref(element);
  };

  switch (fieldType) {

    case FormFieldType.INPUT:
      return (
        <div className="relative flex items-center">
          {iconSrc && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              {getIcon(iconSrc)}
            </span>
          )}
          <FormControl aria-describedby={descriptionId}>
            <Input
              {...field}
              id={inputId}
              ref={setInputRef}
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
        <div className="relative flex items-center">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <MdPhone size={16} className="text-gray-400" />
          </span>
          <FormControl aria-describedby={descriptionId}>
            <Input
              {...field}
              id={inputId}
              ref={setInputRef}
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
          </FormControl>
        </div>
      );

    case FormFieldType.SELECT:
      return (
        <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={disabled}>
          <FormControl aria-describedby={descriptionId}>
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
          </FormControl>
          <SelectContent className="max-h-60 rounded-2xl border border-gray-100 bg-white shadow-xl">
            {children}
          </SelectContent>
        </Select>
      );

    case FormFieldType.TEXTAREA:
      return (
        <FormControl aria-describedby={descriptionId}>
          <Textarea
            {...field}
            id={inputId}
            ref={field.ref}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
            autoFocus={autoFocus}
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
        <div className="flex items-center gap-3">
          <FormControl aria-describedby={descriptionId}>
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
          </FormControl>
          <Label htmlFor={inputId} className="text-sm font-semibold text-gray-700 cursor-pointer select-none leading-tight">
            {props.label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </Label>
        </div>
      );

    case FormFieldType.DATE_PICKER:
      return (
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <FormControl aria-describedby={descriptionId}>
              <Button type="button" disabled={disabled} aria-required={required} className={[
                INPUT_BASE, 'px-4 flex items-center gap-3 text-left',
                !field.value ? 'text-gray-300' : 'text-gray-800',
                hasError ? INPUT_ERROR : '',
              ].join(' ')}>
                <CalendarIcon size={15} className="text-gray-400 shrink-0" />
                {field.value ? fmtDate(field.value) : <span>{placeholder ?? 'Pick a date'}</span>}
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border border-gray-100" align="start">
            <Calendar
              mode="single"
              selected={field.value instanceof Date ? field.value : field.value ? new Date(field.value) : undefined}
              onSelect={(date) => {
                if (date) {
                  field.onChange(date);
                  onDateSelected();
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
      return renderSkeleton ? renderSkeleton(field, inputId) : null;

    default:
      return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const CustomFormField: React.FC<CustomProps> = (props) => {
  const { control, name, label, fieldType, description, autoFocus, required, disabled } = props;
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

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
              <FormLabel id={`${inputId}-label`} htmlFor={inputId} className={LABEL_BASE}>
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
            {renderField(field, props, inputId, fieldState, inputRef, () => setDateOpen(false), dateOpen, setDateOpen)}

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