# LUMINA PRODUCTS

iPhone 平置き写真 → ハイブランド EC 品質の物撮り画像。

- **flat-lay**: Miu Miu / MaxMara editorial スタイル（front + back）
- **ghost mannequin**: MR PORTER / NET-A-PORTER 標準（4-view: front/back/side/detail）
- **both**: 1 SKU = 6枚パッケージ

## Stack

Vite + React 19 + TypeScript + Tailwind v4 + Gemini API
- analyze: gemini-2.5-flash
- generate: gemini-3.1-flash-image-preview

## Local dev

```bash
npm install
cp .env.local.example .env.local   # add VITE_GEMINI_API_KEY
npm run dev                        # http://localhost:5174
```

API key は localhost では env、本番ではブラウザの localStorage に保存（サーバ送信なし）。

## Deploy

GitHub に push → Vercel で `Ghost3nexus/lumina-products` を connect → 自動デプロイ。
