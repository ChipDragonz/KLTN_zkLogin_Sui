// frontend/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// THÊM ĐOẠN NÀY VÀO ĐỂ ÉP VITE ĐÓNG GÓI SUI SDK CHUẨN XÁC:
	optimizeDeps: {
		include: [
			'@mysten/sui/client',
			'@mysten/sui/transactions',
			'@mysten/enoki',
			'js-sha256'
		]
	}
});