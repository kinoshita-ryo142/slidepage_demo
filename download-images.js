import { createClient } from 'microcms-js-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ローカル開発用・本番用の .env ファイルから環境変数を読み込む
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// microCMSクライアントの初期化
const client = createClient({
  serviceDomain: process.env.VITE_MICROCMS_DOMAIN,
  apiKey: process.env.VITE_MICROCMS_API_KEY,
});

// 画像をダウンロードして保存する関数
async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`画像の取得に失敗しました: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(destPath, buffer);
}

async function main() {
  try {
    console.log('1. microCMSからデータを取得中...');
    const res = await client.getList({
      endpoint: 'slidepage', // エンドポイント名
      queries: { limit: 100 },
    });

    // 画像の保存先 (public/downloaded-images/) を用意
    const outputDir = path.join(__dirname, 'public', 'downloaded-images');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const localContents = [];

    console.log('2. 画像のダウンロードを開始します...');
    for (const post of res.contents) {
      const imageUrl = post.imagefile.url;
      
      // microCMSのURLから拡張子を取得（.webp など）、ファイル名は重複しないよう post.id を使用
      const ext = path.extname(new URL(imageUrl).pathname) || '.webp';
      const fileName = `${post.id}${ext}`;
      const destPath = path.join(outputDir, fileName);

      // ダウンロード実行
      await downloadImage(imageUrl, destPath);
      console.log(` -> ダウンロード完了: ${fileName}`);

      // 画像URLをローカルのパス（/lp/summer/downloaded-images/...）に書き換えたデータを作成
      localContents.push({
        ...post,
        imagefile: {
          ...post.imagefile,
          url: `/lp/summer/downloaded-images/${fileName}`, // public内の相対パスに変換
        }
      });
    }

    // 3. カテゴリごとにグループ化
    console.log('3. データをカテゴリごとにグループ化しています...');
    const groups = {};
    localContents.forEach(post => {
      const catName = post.category?.name || 'Others';
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(post);
    });

    // 4. src/lib/postsData.json として書き出し
    const dataDir = path.join(__dirname, 'src', 'lib');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'postsData.json'),
      JSON.stringify(groups, null, 2)
    );

    console.log('✨ すべての画像のダウンロードと postsData.json の生成が正常に完了しました！');
  } catch (error) {
    console.error('❌ 事前ビルド処理でエラーが発生しました:', error);
    process.exit(1);
  }
}

main();