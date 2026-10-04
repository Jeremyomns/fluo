import { accessToken, signOut } from '../lib/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown };

/** En-têtes d'une requête authentifiée. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** fetch vers /api avec le jeton de connexion, du JSON et des messages d'erreur lisibles. */
export async function api<T = void>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(json !== undefined && { 'Content-Type': 'application/json' }),
        ...(await authHeaders()),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Connexion impossible. Vérifie ta connexion Internet.');
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* réponse non JSON */
    }
    if (res.status === 401) void signOut(); // session expirée ou révoquée : retour à l'écran de connexion
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
