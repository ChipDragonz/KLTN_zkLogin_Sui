import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

// Khởi tạo SuiClient kết nối trực tiếp đến Testnet (dành cho @mysten/sui v2.0+)
export const suiClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl('testnet'),
    network: 'testnet',
});