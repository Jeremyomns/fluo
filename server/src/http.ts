/** Erreur métier renvoyée telle quelle au client (message en français). */
export class HttpError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
  }
}
