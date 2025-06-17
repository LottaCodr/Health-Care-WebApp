'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { FormFieldType } from './forms/PatientForm';
import Image from 'next/image';
import PhoneInput from 'react-phone-number-input';
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
}

const COMMON_CLASS =
  'w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const renderField = (field: any, props: CustomProps) => {
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
  } = props;

  switch (fieldType) {
    case FormFieldType.INPUT:
      return (
        <div className="flex items-center gap-2">
          {iconSrc && (
            <Image
              src={iconSrc}
              alt={iconAlt || 'icon'}
              height={20}
              width={20}
              className="text-gray-400"
            />
          )}
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              disabled={disabled}
              className={COMMON_CLASS}
            />
          </FormControl>
        </div>
      );

    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <PhoneInput
            international
            defaultCountry="NG"
            value={field.value}
            onChange={field.onChange}
            placeholder={placeholder}
            className={COMMON_CLASS}
          />
        </FormControl>
      );

    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger className={COMMON_CLASS}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
          </Select>
        </FormControl>
      );

    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            {...field}
            placeholder={placeholder}
            disabled={disabled}
            className={COMMON_CLASS + ' resize-none'}
          />
        </FormControl>
      );

    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-center gap-3">
            <Checkbox
              id={props.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-checked={field.value}
            />
            <label
              htmlFor={props.name}
              className="text-sm font-medium text-gray-700"
            >
              {props.label}
            </label>
          </div>
        </FormControl>
      );

    case FormFieldType.DATE_PICKER:
      return (
        <div className="flex items-center gap-2">
          <Image
            src="/assets/icons/calendar.svg"
            height={20}
            width={20}
            alt="calendar icon"
          />
          <FormControl>
            <DatePicker
              selected={field.value}
              onChange={(date) => field.onChange(date)}
              dateFormat={dateFormat || 'MM/dd/yyyy'}
              showTimeSelect={showTimeSelected}
              className={COMMON_CLASS}
              placeholderText={placeholder}
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
  const { control, name, label, fieldType } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full space-y-2">
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className="text-sm font-semibold text-gray-700">
              {label}
            </FormLabel>
          )}
          {renderField(field, props)}
          <FormMessage className="text-sm text-red-500 mt-1" />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
