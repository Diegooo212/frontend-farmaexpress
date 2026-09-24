import httpClient from './httpClient';

// El BFF registra/actualiza el perfil de la persona a partir de su token de Entra ID.
export const getMe = () => httpClient.get('/api/bff/auth/me').then((res) => res.data);
