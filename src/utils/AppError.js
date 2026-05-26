
export class AppError extends Error {
    constructor(message, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
      this.status = statusCode
      this.isOperational = true
      Error.captureStackTrace(this, this.constructor)
    }
  }
  
  