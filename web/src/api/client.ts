import { accessToken, recoverSession } from '../lib/auth';

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
  const send = async (auth: Record<string, string>) => {
    try {
      return await fetch(`/api${path}`, {
        ...init,
        headers: {
          ...(json !== undefined && { 'Content-Type': 'application/json' }),
          ...auth,
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : undefined,
      });
    } catch {
      throw new ApiError(0, 'Connexion impossible. Vérifie ta connexion Internet.');
    }
  };

  let res = await send(await authHeaders());
  if (res.status === 401) {
    // Jeton périmé (téléphone en veille…) : on renouvelle la session et on réessaie une fois.
    const token = await recoverSession();
    if (!token) throw new ApiError(401, 'Session à renouveler. Vérifie ta connexion Internet.');
    res = await send({ Authorization: `Bearer ${token}` });
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
