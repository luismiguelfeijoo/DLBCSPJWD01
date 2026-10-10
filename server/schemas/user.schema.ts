import { Type } from 'typebox';

// Path params schema for routes with :id
export const UserIdParamsSchema = Type.Object({
  id: Type.String({
    minLength: 24,
    maxLength: 24,
    description: 'MongoDB ObjectId hex string of the user',
  }),
});
export type UserIdParams = Type.Static<typeof UserIdParamsSchema>;

// Request body schema for PATCH /users/:id
export const UpdateUserBaseCurrencySchema = Type.Object({
  baseCurrency: Type.String({
    minLength: 1,
    description: 'Base currency ISO code (e.g. USD, EUR)',
  }),
});
export type UpdateUserBaseCurrency = Type.Static<typeof UpdateUserBaseCurrencySchema>;

// Response schema for single user
export const UserResponseSchema = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.String(),
  email: Type.String(),
  baseCurrency: Type.String(),
  createdAt: Type.Optional(Type.String()),
  updatedAt: Type.Optional(Type.String()),
});
export type UserResponse = Type.Static<typeof UserResponseSchema>;

// Response schema for list of users (GET /users)
export const UsersResponseSchema = Type.Array(UserResponseSchema);
export type UsersResponse = Type.Static<typeof UsersResponseSchema>;

// Response schema for user currencies (GET /users/:id/currencies)
export const UserCurrenciesResponseSchema = Type.Array(Type.String());
export type UserCurrenciesResponse = Type.Static<typeof UserCurrenciesResponseSchema>;
