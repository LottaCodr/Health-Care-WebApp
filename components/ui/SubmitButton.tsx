'use client';

import React from 'react';
import { Button } from './button';
import Image from 'next/image';

type SubmitButtonProps = {
  isLoading: boolean;
  className?: string;
  children: React.ReactNode;
};

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading,
  className,
  children,
}) => {
  return (
    <Button
      type="submit"
      disabled={isLoading}
      aria-busy={isLoading}
      className={className ?? 'w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition duration-150 disabled:opacity-60'}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Image
            src="/assets/icons/loader.svg"
            alt="Loading spinner"
            width={20}
            height={20}
            className="animate-spin"
          />
          <span className="text-sm font-medium">Processing...</span>
        </span>
      ) : (
        <span className="text-sm font-semibold">{children}</span>
      )}
    </Button>
  );
};

export default SubmitButton;
