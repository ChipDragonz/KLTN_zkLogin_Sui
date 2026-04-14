// src/lib/enoki.ts
import { EnokiFlow } from '@mysten/enoki';
import { env } from '$env/dynamic/public';

// Sử dụng EnokiFlow cho các tác vụ đăng nhập ở Frontend
export const enokiFlow = new EnokiFlow({ 
    apiKey: env.PUBLIC_ENOKI_API_KEY 
});