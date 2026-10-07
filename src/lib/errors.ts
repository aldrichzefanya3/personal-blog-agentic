/**
 * Application error hierarchy.
 * All errors extend AppError which carries an HTTP status code.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthError extends AppError {
  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN', statusCode: 401 | 403) {
    super(
      code === 'UNAUTHENTICATED' ? 'Authentication required' : 'Access denied',
      code,
      statusCode,
    );
  }
}

export class ValidationError extends AppError {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super('Validation failed', 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 500);
  }
}

export class RenderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'RENDER_ERROR', 500, cause);
  }
}
