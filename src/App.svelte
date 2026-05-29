<script lang="ts">
  import { onMount, tick, onDestroy } from 'svelte';
  import { createClient } from 'microcms-js-sdk';
  import Slide from './Slide.svelte';

  // MicroCMSクライアントの初期化
  const client = createClient({
    serviceDomain: import.meta.env.VITE_MICROCMS_DOMAIN,
    apiKey: import.meta.env.VITE_MICROCMS_API_KEY,
  });

  console.log("microCMS domain", import.meta.env.VITE_MICROCMS_DOMAIN);
  console.log("microCMS baseURL", `https://${import.meta.env.VITE_MICROCMS_DOMAIN}.microcms.io/api/v1`);
  const ENDPOINT = 'slidepage';

  // 型定義
  type Category = { id?: string; name: string };
  type Post = {
    id: string;
    imagefile: { url: string; width: number; height: number };
    category?: Category;
  };
  type GroupedPosts = Record<string, Post[]>;

  // Svelte 5 Runes を使用した状態管理
  let groupedData = $state<GroupedPosts>({});
  let categories = $state<string[]>([]);
  let isLoading = $state(true);

  let mainEl = $state<HTMLElement | null>(null);
  const sectionEls: HTMLElement[] = [];
  let currentCategory = $state(0);
  let sectionScrollTop = $state(0);

  // $derived による効率的なリアクティブ判定
  const canScrollUp = $derived(sectionScrollTop > 0);
  const canScrollDown = $derived(() => {
    const sec = sectionEls[currentCategory];
    return sec ? sectionScrollTop + sec.clientHeight < sec.scrollHeight - 1 : false;
  });
  const canPrevCat = $derived(currentCategory > 0);
  const canNextCat = $derived(currentCategory < categories.length - 1);

  function scrollToCategory(index: number) {
    if (mainEl && sectionEls[index]) {
      mainEl.scrollTo({ left: sectionEls[index].offsetLeft, behavior: 'smooth' });
      currentCategory = index;
      sectionScrollTop = sectionEls[index].scrollTop;
      history.replaceState(null, '', '#cat' + index);
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
    if (!sec) return;
    const slides = Array.from(sec.children) as HTMLElement[];
    if (slides.length === 0) return;

    const scrollTop = sec.scrollTop;
    const scrollPad = parseFloat(getComputedStyle(sec).scrollPaddingTop) || 0;
    if (delta > 0) {
      const next = slides.find(el => el.offsetTop - scrollPad > scrollTop + 1);
      if (next) sec.scrollTo({ top: next.offsetTop - scrollPad, behavior: 'smooth' });
    } else {
      const prev = [...slides].reverse().find(el => el.offsetTop - scrollPad < scrollTop - 1);
      if (prev) sec.scrollTo({ top: prev.offsetTop - scrollPad, behavior: 'smooth' });
    }
  }

  // アクション内でのイベント追加と、要素破棄時のクリーンアップ
  function registerSection(node: HTMLElement, index: number) {
    sectionEls[index] = node;

    const handleScroll = () => {
      if (index === currentCategory) {
        sectionScrollTop = node.scrollTop;
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let isAnimating = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        if (dx < 0) nextCategory();
        else prevCategory();
        return;
      }

      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30 && !isAnimating) {
        isAnimating = true;
        scrollPage(dy < 0 ? 1 : -1);

        const onScrollEnd = () => {
          isAnimating = false;
        };
        node.addEventListener('scrollend', onScrollEnd, { once: true });

        setTimeout(() => {
          isAnimating = false;
          node.removeEventListener('scrollend', onScrollEnd);
        }, 700);
      }
    };

    node.addEventListener('scroll', handleScroll, { passive: true });
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });

    return {
      destroy() {
        node.removeEventListener('scroll', handleScroll);
        node.removeEventListener('touchstart', handleTouchStart);
        node.removeEventListener('touchmove', handleTouchMove);
        node.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }

  // クリーンアップ用にイベントハンドラをスコープ外に保持
  let handleMainScroll: () => void;
  let handleResize: () => void;
  let handlePopState: () => void;

  onMount(async () => {
    try {
      const res = await client.getList<Post>({
        endpoint: ENDPOINT,
        queries: { limit: 100 },
      });

      const groups: GroupedPosts = {};
      res.contents.forEach(post => {
        const catName = post.category?.name || 'Others';
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push(post);
      });

      groupedData = groups;
      const COMMON_CATEGORY = 'フロント共通';
      categories = Object.keys(groups).filter(c => c !== COMMON_CATEGORY);

      isLoading = false;
      await tick();

      if (mainEl) {
        handleMainScroll = () => {
          const left = mainEl!.scrollLeft;
          const idx = sectionEls.findIndex(sec =>
            sec && left >= sec.offsetLeft - 1 && left < sec.offsetLeft + sec.offsetWidth - 1
          );
          if (idx !== -1 && idx !== currentCategory) {
            currentCategory = idx;
            history.replaceState(null, '', '#cat' + idx);
          }
        };
        mainEl.addEventListener('scroll', handleMainScroll, { passive: true });
      }

      handleResize = () => {
        if (mainEl && sectionEls[currentCategory]) {
          mainEl.scrollTo({ left: sectionEls[currentCategory].offsetLeft, behavior: 'instant' });
        }
      };
      window.addEventListener('resize', handleResize);

      const hashToIndex = (hash: string) => {
        const m = hash.match(/^cat(\d+)$/);
        return m ? parseInt(m[1], 10) : -1;
      };

      const initialIdx = hashToIndex(window.location.hash.slice(1));
      if (initialIdx > 0 && initialIdx < categories.length) scrollToCategory(initialIdx);

      handlePopState = () => {
        const idx = hashToIndex(window.location.hash.slice(1));
        scrollToCategory(idx !== -1 ? idx : 0);
      };
      window.addEventListener('popstate', handlePopState);

    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      isLoading = false;
    }
  });

  // コンポーネント破棄（アンマウント）時にグローバルイベントを確実に解除
  onDestroy(() => {
    if (mainEl && handleMainScroll) mainEl.removeEventListener('scroll', handleMainScroll);
    if (handleResize) window.removeEventListener('resize', handleResize);
    if (handlePopState) window.removeEventListener('popstate', handlePopState);
  });
</script>

{#if isLoading}
  <div class="flex h-dvh w-full items-center justify-center bg-black text-white">
    <p>Loading...</p>
  </div>
{:else}
  <main bind:this={mainEl} class="flex h-dvh w-full overflow-x-scroll snap-x snap-mandatory bg-black hide-scrollbar">
    {#each categories as category, i}
      <section use:registerSection={i} class="h-dvh min-w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar pt-14 scroll-pt-14">
        
        {#each (groupedData['フロント共通'] ?? []) as post, index (post.id + '-common-' + category)}
          <Slide src={post.imagefile.url} isFirst={i === 0 && index === 0} />
        {/each}

        {#each groupedData[category] as post, index (post.id)}
          <Slide src={post.imagefile.url} isFirst={i === 0 && (groupedData['フロント共通'] ?? []).length === 0 && index === 0} />
        {/each}
        
      </section>
    {/each}
  </main>

  <div class="absolute top-0 left-0 w-full h-14 z-50 flex items-center justify-center bg-white shadow-md">
    <div class="flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md">
      {#each categories as category, i}
        <button
          onclick={() => scrollToCategory(i)}
          class={`px-4 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            i === currentCategory ? 'bg-white text-black' : 'text-white hover:bg-white/20'
          }`}
        >
          {category}
        </button>
      {/each}
    </div>
  </div>

  <div class="hidden lg:flex flex-col gap-2 absolute bottom-4 right-4 z-50 w-30">
    <div class="text-center">
      <button onclick={() => scrollPage(-1)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollUp ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
        ↑
      </button>
    </div>
    <div class="flex">
      <button onclick={prevCategory} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canPrevCat ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
        ←
      </button>
      <button onclick={nextCategory} class={`p-2 w-10 h-10 ml-auto rounded-full text-white transition-colors ${canNextCat ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
        →
      </button>
    </div>
    <div class="text-center">
      <button onclick={() => scrollPage(1)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollDown() ? 'bg-white/70 cursor-pointer' : 'bg-white/20'}`}>
        ↓
      </button>
    </div>
  </div>
{/if}

<style>
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
    overscroll-behavior: contain; 
  }
</style>