import { Type } from 'typebox';

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
});

export type ErrorResponse = Type.Static<typeof ErrorResponseSchema>;
