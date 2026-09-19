"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wide text-[#1A1D23] mb-1.5 uppercase">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}