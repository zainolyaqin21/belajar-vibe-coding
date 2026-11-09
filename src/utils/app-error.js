export class AppError extends Error {
  /**
   * @param {string} message - Pesan error
   * @param {number} [statusCode=500] - HTTP status code
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
