/**
 * Base URL for server-side calls to the .NET API.
 *
 * BACKEND_URL lets a deployment use a private/internal address; when it isn't set we fall back
 * to the public API URL the browser uses, and only then to the local dev default. (Previously an
 * unset BACKEND_URL meant production called http://localhost:5000, which doesn't exist there.)
 */
export const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
