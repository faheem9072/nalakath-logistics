import { z } from 'zod';

export const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number is too short')
    .max(16, 'Phone number is too long')
    .regex(
      /^\+?[1-9]\d{9,14}$/,
      'Enter a valid phone number with country code (e.g. +919400112233)'
    ),
});

export const otpSchema = z.object({
  phone: z.string().min(10),
  token: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;
