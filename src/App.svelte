<script lang="ts">
  import { onMount } from 'svelte';
  import { createClient } from 'microcms-js-sdk';
  import Slide from './Slide.svelte';

  // MicroCMSクライアントの初期化
  const client = createClient({
    serviceDomain: import.meta.env.VITE_MICROCMS_DOMAIN,
    apiKey: import.meta.env.VITE_MICROCMS_API_KEY,
  });

  // 起動時に環境変数とベースURLを確認しておくと404原因の切り分けに役立つ
  console.log("microCMS domain", import.meta.env.VITE_MICROCMS_DOMAIN);
  console.log("microCMS baseURL", `https://${import.meta.env.VITE_MICROCMS_DOMAIN}.microcms.io/api/v1`);
  // 取得するエンドポイント名は実際にダッシュボードにあるものに合わせる
  const ENDPOINT = 'slidepage'; // 例: 'images' や 'posts' など


  // 型定義
  // カテゴリはオブジェクトとして返される (e.g. { id, name, ... })
  type Category = {
    id?: string;
    name: string;
    // 他のフィールドがあっても OK
    [key: string]: any;
  };

  type Post = {
    id: string;
    imagefile: { url: string; width: number; height: number };
    category?: Category; // 単一オブジェクト、存在しない可能性もある
  };

  // カテゴリごとにグループ化されたデータの型
  type GroupedPosts = Record<string, Post[]>;

  let groupedData: GroupedPosts = {};
  let categories: string[] = [];
  let isLoading = true;

  // ナビゲーション用リファレンスと状態
  let mainEl: HTMLElement;
  const sectionEls: HTMLElement[] = [];
  let currentCategory = 0;
  let sectionScrollTop = 0; // 現在のセクションの縦スクロール位置

  // ボタン有効/無効の判定
  $: canScrollUp = sectionScrollTop > 0;
  $: canScrollDown = sectionEls[currentCategory]
    ? sectionScrollTop + sectionEls[currentCategory].clientHeight < sectionEls[currentCategory].scrollHeight - 1
    : false;
  $: canPrevCat = currentCategory > 0;
  $: canNextCat = currentCategory < categories.length - 1;

  function scrollToCategory(index: number) {
    if (mainEl && sectionEls[index]) {
      mainEl.scrollTo({ left: sectionEls[index].offsetLeft, behavior: 'smooth' });
      currentCategory = index;
      sectionScrollTop = sectionEls[index].scrollTop;
    }
  }

  function nextCategory() {
    if (currentCategory < categories.length - 1) {
      scrollToCategory(currentCategory + 1);
    }
  }
  function prevCategory() {
    if (currentCategory > 0) {
      scrollToCategory(currentCategory - 1);
    }
  }

  function scrollPage(delta: number) {
    const sec = sectionEls[currentCategory];
    if (sec) {
      sec.scrollBy({ top: delta, behavior: 'smooth' });
    }
  }

  // セクション要素を配列に登録するアクション
  function registerSection(node: HTMLElement, index: number) {
    sectionEls[index] = node;
    node.addEventListener('scroll', () => {
      if (index === currentCategory) {
        sectionScrollTop = node.scrollTop;
      }
    }, { passive: true });
    return {};
  }

  onMount(async () => {
    try {
      // MicroCMSからデータ取得
      const res = await client.getList<Post>({
        endpoint: ENDPOINT,          // ←正しいエンドポイントをセット
        queries: { limit: 100 },     // 必要に応じて調整
      });

      // 取得したデータをカテゴリごとにグループ化する
      const groups: GroupedPosts = {};
      res.contents.forEach(post => {
        // カテゴリはオブジェクトなので name プロパティを利用
        const catName = post.category?.name || 'Others';
        if (!groups[catName]) {
          groups[catName] = [];
        }
        groups[catName].push(post);
      });
      console.log(groups);

      groupedData = groups;
      categories = Object.keys(groups);

      // 現在のカテゴリインデックスを追跡するため、手動スクロール時にも更新
      if (mainEl) {
        mainEl.addEventListener('scroll', () => {
          const left = mainEl.scrollLeft;
          const idx = sectionEls.findIndex(sec =>
            sec && left >= sec.offsetLeft - 1 && left < sec.offsetLeft + sec.offsetWidth - 1
          );
          if (idx !== -1) currentCategory = idx;
        }, { passive: true });
      }

      // ウィンドウリサイズ時に現在のカテゴリへ再スナップ
      window.addEventListener('resize', () => {
        if (mainEl && sectionEls[currentCategory]) {
          mainEl.scrollTo({ left: sectionEls[currentCategory].offsetLeft, behavior: 'instant' });
        }
      });
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

{#if isLoading}
  <div class="flex h-dvh w-full items-center justify-center bg-black text-white">
    <p>Loading...</p>
  </div>
{:else}
  <main bind:this={mainEl} class="flex h-dvh w-full overflow-x-scroll snap-x snap-mandatory bg-black hide-scrollbar">
    
    {#each categories as category, i}
      <section use:registerSection={i} class="h-dvh min-w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
        
        {#each groupedData[category] as post (post.id)}
          <Slide src={post.imagefile.url} />
        {/each}
        
      </section>
    {/each}

  </main>

      <!-- 現在のカテゴリ表示 (categoriesの変更に連動) -->
      <div class="absolute top-4 left-4 z-50 rounded-full bg-black/50 px-4 py-1 text-white backdrop-blur-md pointer-events-none">
        {categories[currentCategory] ?? ''}
      </div>

      <!-- デスクトップ用のナビゲーションボタン -->
      <div class="hidden lg:flex flex-col gap-2 absolute bottom-4 right-4 z-50 w-30">
        <div class="text-center">
          <button on:click={() => scrollPage(-window.innerHeight)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollUp ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
            ↑
          </button>
        </div>
        <div class="flex">
          <button on:click={prevCategory} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canPrevCat ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
            ←
          </button>
          <button on:click={nextCategory} class={`p-2 w-10 h-10 ml-auto rounded-full text-white transition-colors ${canNextCat ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
            →
          </button>
        </div>
        <div class="text-center">
          <button on:click={() => scrollPage(window.innerHeight)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollDown ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
            ↓
          </button>
        </div>
      </div>
{/if}

<style>
  /* スクロールバーを非表示にするユーティリティクラス */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
    /* モバイルブラウザでの余計なスクロール連鎖を防ぐ */
    overscroll-behavior: contain; 
  }
</style>