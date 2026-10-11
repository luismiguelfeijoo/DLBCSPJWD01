import { Type } from 'typebox';

export const ErrorResponseSchema = Type.Object({
  error: Type.String({
    default: 'Internal Server Error',
    description: 'Error name or HTTP status message',
  }),
  message: Type.String({
    default: 'An unexpected error occurred',
    description: 'Detailed error explanation',
  }),
});

export type ErrorResponse = Type.Static<typeof ErrorResponseSchema>;

export const DEFAULT_ERROR_RESPONSE: ErrorResponse = {
  error: 'Internal Server Error',
  message: 'An unexpected error occurred',
};

