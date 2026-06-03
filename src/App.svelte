<script lang="ts">
  // ビルド時に生成されたローカルJSONデータを直接インポート
  import staticGroupedData from './lib/postsData.json';
  import Slide from './Slide.svelte';

  // カテゴリ一覧を取得（'フロント共通' を除外するロジックは維持）
  const COMMON_CATEGORY = 'フロント共通';
  const categories = Object.keys(staticGroupedData).filter(c => c !== COMMON_CATEGORY);
  const backgroundImageUrl = `${import.meta.env.BASE_URL}images/bg_image.webp`;
  const logoImageUrl = `${import.meta.env.BASE_URL}images/v-st_logo.png`;
  const banners = [
    {
      imageUrl: `${import.meta.env.BASE_URL}images/banner01.webp`,
      href: 'https://business.form-mailer.jp/fms/4724c1ed246648'
    },
    {
      imageUrl: `${import.meta.env.BASE_URL}images/banner02.webp`,
      href: 'tel:0120542210'
    }
  ];

  let mainEl = $state<HTMLElement | null>(null);
  let bannerStripEl = $state<HTMLDivElement | null>(null);
  const sectionEls: HTMLElement[] = [];
  let currentCategory = $state(0);
  let sectionScrollTop = $state(0);
  let scrollMetricsVersion = $state(0);

  // 判定ロジック
  const canScrollUp = $derived.by(() => {
    scrollMetricsVersion;
    const sec = sectionEls[currentCategory];
    return sec ? getCurrentSlideIndex(sec) > 0 : false;
  });
  const canScrollDown = $derived.by(() => {
    scrollMetricsVersion;
    const sec = sectionEls[currentCategory];
    return sec ? sectionScrollTop + sec.clientHeight < sec.scrollHeight - 1 : false;
  });
  const canPrevCat = $derived(currentCategory > 0);
  const canNextCat = $derived(currentCategory < categories.length - 1);

  function refreshScrollMetrics(index: number = currentCategory) {
    const sec = sectionEls[index];
    if (!sec) return;
    if (index === currentCategory) sectionScrollTop = sec.scrollTop;
    scrollMetricsVersion += 1;
  }

  function syncBottomBannerHeight() {
    if (!bannerStripEl) return;
    document.documentElement.style.setProperty('--bottom-banner-height', `${bannerStripEl.offsetHeight}px`);
  }

  function scrollToCategory(index: number) {
    if (mainEl && sectionEls[index]) {
      mainEl.scrollTo({ left: sectionEls[index].offsetLeft, behavior: 'smooth' });
      currentCategory = index;
      refreshScrollMetrics(index);
      history.replaceState(null, '', '#cat' + index);
    }
  }

  function nextCategory() {
    if (currentCategory < categories.length - 1) scrollToCategory(currentCategory + 1);
  }
  function prevCategory() {
    if (currentCategory > 0) scrollToCategory(currentCategory - 1);
  }

  function getSlideTarget(sec: HTMLElement, delta: number) {
    const slides = Array.from(sec.children) as HTMLElement[];
    if (slides.length === 0) return null;

    const scrollTop = sec.scrollTop;
    const scrollPad = parseFloat(getComputedStyle(sec).scrollPaddingTop) || 0;
    if (delta > 0) {
      const next = slides.find(el => el.offsetTop - scrollPad > scrollTop + 1);
      return next ? next.offsetTop - scrollPad : null;
    }

    const prev = [...slides].reverse().find(el => el.offsetTop - scrollPad < scrollTop - 1);
    return prev ? prev.offsetTop - scrollPad : null;
  }

  function getCurrentSlideIndex(sec: HTMLElement) {
    const slides = Array.from(sec.children) as HTMLElement[];
    if (slides.length === 0) return 0;

    const scrollTop = sec.scrollTop;
    const scrollPad = parseFloat(getComputedStyle(sec).scrollPaddingTop) || 0;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideTop = slide.offsetTop - scrollPad;
      const distance = Math.abs(scrollTop - slideTop);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  function scrollPage(delta: number) {
    const sec = sectionEls[currentCategory];
    if (!sec) return;
    const targetTop = getSlideTarget(sec, delta);
    if (targetTop === null) return;
    sec.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  // 最初（一番目）のスライドにスクロールで戻る関数
  function scrollToTop() {
    const sec = sectionEls[currentCategory];
    if (sec) {
      sec.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function registerSection(node: HTMLElement, index: number) {
    sectionEls[index] = node;
    let scrollRafId = 0;
    const handleScroll = () => {
      if (scrollRafId !== 0) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = 0;
        if (index === currentCategory) refreshScrollMetrics(index);
      });
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let isAnimating = false;
    let animationResetId: number | undefined;
    let scrollEndTimeoutId: number | undefined;
    let activeOnScrollEnd: (() => void) | undefined;

    const releaseAnimationLock = () => {
      isAnimating = false;
      if (animationResetId !== undefined) {
        window.clearTimeout(animationResetId);
        animationResetId = undefined;
      }
    };

    const lockAnimation = () => {
      isAnimating = true;
      if (animationResetId !== undefined) window.clearTimeout(animationResetId);
      animationResetId = window.setTimeout(() => {
        animationResetId = undefined;
        isAnimating = false;
      }, 450);
    };

    const handleScrollEnd = () => {
      releaseAnimationLock();
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || Math.abs(event.deltaY) < 4) return;

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      const targetTop = getSlideTarget(node, direction);
      if (targetTop === null) {
        event.preventDefault();
        releaseAnimationLock();
        return;
      }

      event.preventDefault();
      if (isAnimating) return;

      lockAnimation();
      node.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx)) e.preventDefault();
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
        lockAnimation();
        scrollPage(dy < 0 ? 1 : -1);
        
        if (activeOnScrollEnd) {
          node.removeEventListener('scrollend', activeOnScrollEnd);
        }

        const onScrollEnd = () => {
          releaseAnimationLock();
          activeOnScrollEnd = undefined;
        };
        activeOnScrollEnd = onScrollEnd;
        node.addEventListener('scrollend', onScrollEnd, { once: true });

        if (scrollEndTimeoutId !== undefined) {
          window.clearTimeout(scrollEndTimeoutId);
        }

        scrollEndTimeoutId = window.setTimeout(() => {
          scrollEndTimeoutId = undefined;
          releaseAnimationLock();
          if (activeOnScrollEnd) {
            node.removeEventListener('scrollend', activeOnScrollEnd);
            activeOnScrollEnd = undefined;
          }
        }, 700);
      }
    };

    node.addEventListener('scroll', handleScroll, { passive: true });
    node.addEventListener('scrollend', handleScrollEnd);
    node.addEventListener('wheel', handleWheel, { passive: false });
    requestAnimationFrame(() => refreshScrollMetrics(index));
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });

    return {
      destroy() {
        if (scrollRafId !== 0) cancelAnimationFrame(scrollRafId);
        releaseAnimationLock();
        if (scrollEndTimeoutId !== undefined) {
          window.clearTimeout(scrollEndTimeoutId);
          scrollEndTimeoutId = undefined;
        }
        if (activeOnScrollEnd) {
          node.removeEventListener('scrollend', activeOnScrollEnd);
          activeOnScrollEnd = undefined;
        }
        node.removeEventListener('scroll', handleScroll);
        node.removeEventListener('scrollend', handleScrollEnd);
        node.removeEventListener('wheel', handleWheel);
        node.removeEventListener('touchstart', handleTouchStart);
        node.removeEventListener('touchmove', handleTouchMove);
        node.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }

  $effect(() => {
    const activeMainEl = mainEl;
    let handleMainScroll: (() => void) | undefined;

    if (activeMainEl) {
      handleMainScroll = () => {
        const left = activeMainEl.scrollLeft;
        const idx = sectionEls.findIndex(sec =>
          sec && left >= sec.offsetLeft - 1 && left < sec.offsetLeft + sec.offsetWidth - 1
        );
        if (idx !== -1 && idx !== currentCategory) {
          currentCategory = idx;
          refreshScrollMetrics(idx);
          history.replaceState(null, '', '#cat' + idx);
        }
      };
      activeMainEl.addEventListener('scroll', handleMainScroll, { passive: true });
    }

    const handleResize = () => {
      if (activeMainEl && sectionEls[currentCategory]) {
        activeMainEl.scrollTo({ left: sectionEls[currentCategory].offsetLeft, behavior: 'instant' });
        refreshScrollMetrics(currentCategory);
      }
      syncBottomBannerHeight();
    };
    window.addEventListener('resize', handleResize);

    let localBannerResizeObserver: ResizeObserver | undefined;
    if (bannerStripEl) {
      localBannerResizeObserver = new ResizeObserver(() => syncBottomBannerHeight());
      localBannerResizeObserver.observe(bannerStripEl);
      requestAnimationFrame(() => syncBottomBannerHeight());
    }

    const hashToIndex = (hash: string) => {
      const m = hash.match(/^cat(\d+)$/);
      return m ? parseInt(m[1], 10) : -1;
    };

    const initialIdx = hashToIndex(window.location.hash.slice(1));
    if (initialIdx > 0 && initialIdx < categories.length) scrollToCategory(initialIdx);

    const handlePopState = () => {
      const idx = hashToIndex(window.location.hash.slice(1));
      scrollToCategory(idx !== -1 ? idx : 0);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (activeMainEl && handleMainScroll) {
        activeMainEl.removeEventListener('scroll', handleMainScroll);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handlePopState);
      localBannerResizeObserver?.disconnect();
      document.documentElement.style.removeProperty('--bottom-banner-height');
    };
  });
</script>

<div
  class="pointer-events-none fixed inset-0 bg-cover bg-center opacity-50"
  style={`background-image: url('${backgroundImageUrl}');`}
></div>

<main bind:this={mainEl} class="relative z-10 flex w-full overflow-x-scroll snap-x snap-mandatory hide-scrollbar" style="height: var(--app-viewport-height);">
  {#each categories as category, i}
    <section use:registerSection={i} class="box-border min-w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar pt-14 pb-(--bottom-banner-height) scroll-pt-14" style="height: var(--app-viewport-height);">
      
      {#each (staticGroupedData['フロント共通'] ?? []) as post, index (post.id + '-common-' + category)}
        <Slide src={post.imagefile.url} isFirst={i === 0 && index === 0} oncontentload={() => refreshScrollMetrics(i)} />
      {/each}
      {#each (staticGroupedData[category] ?? []) as post, index (post.id)}
        <Slide src={post.imagefile.url} isFirst={i === 0 && (staticGroupedData['フロント共通'] ?? []).length === 0 && index === 0} oncontentload={() => refreshScrollMetrics(i)} />
      {/each}
      
    </section>
  {/each}
</main>

<div class="absolute top-0 left-0 z-50 h-14 w-full bg-white shadow-md">
  <div class="mx-auto flex h-full items-center justify-center gap-3 px-2 sm:px-0" style="width: min(100vw, var(--slide-display-width));">
    <img src={logoImageUrl} alt="V-sta logo" class="h-5 w-auto shrink-0 sm:h-6" />

    <div class="flex gap-1 rounded-full bg-[#def7e7] p-1 backdrop-blur-md">
      {#each categories as category, i}
        <button
          onclick={() => scrollToCategory(i)}
          class={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            i === currentCategory ? 'bg-[#00a63c] text-white' : 'text-black/60 hover:bg-white/20'
          }`}
        >
          {category}
        </button>
      {/each}
    </div>
  </div>
</div>

<!-- 下向きの「>>」スクロール誘導インジケーター (モバイル・デスクトップ両対応) -->
<div 
  class={`absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none transition-all duration-300 ${
    canScrollDown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
  }`}
  style="bottom: calc(var(--bottom-banner-height) + 0.75rem);"
>
  <span class="text-[9px] text-white font-semibold tracking-wider uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] select-none">
    Scroll
  </span>
  <div class="flex flex-col items-center justify-center -mt-1 h-6">
    <!-- 下向きのダブルアロー(シェブロン) SVGアセット -->
    <svg class="w-6 h-6 text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8l6 6 6-6" class="animate-chevron-top" />
      <path d="M6 14l6 6 6-6" class="animate-chevron-bottom" />
    </svg>
  </div>
</div>

<!-- 2枚目以降のスライドで右下に表示される「一番目に戻る▲」ボタン -->
<div 
  class={`fixed z-30 transition-all duration-300 left-1/2 -translate-x-1/2 flex justify-end ${
    canScrollUp ? 'opacity-100 pointer-events-none' : 'opacity-0 pointer-events-none'
  }`}
  style="bottom: calc(var(--bottom-banner-height) + 0.75rem); width: min(100vw, var(--slide-display-width));"
>
  <div class="pr-2 pointer-events-auto">
    <button 
      onclick={scrollToTop}
      class="flex items-center justify-center w-8 h-8 rounded-full bg-black/70 text-white shadow-lg hover:bg-black/90 active:scale-90 transition-all cursor-pointer border border-white/20"
      aria-label="一番目のスライドに戻る"
    >
      <span class="text-xs -mt-0.5">▲</span>
    </button>
  </div>
</div>

<div class="hidden lg:flex flex-col gap-2 absolute right-4 z-50 w-30 bottom-[calc(var(--bottom-banner-height)+1rem)]">
  <div class="text-center">
    <button onclick={() => scrollPage(-1)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollUp ? 'bg-black/70 cursor-pointer' : 'bg-white/20'}`}>
      ↑
    </button>
  </div>
  <div class="flex">
    <button onclick={prevCategory} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canPrevCat ? 'bg-black/70 cursor-pointer' : 'bg-white/20'}`}>
      ←
    </button>
    <button onclick={nextCategory} class={`p-2 w-10 h-10 ml-auto rounded-full text-white transition-colors ${canNextCat ? 'bg-black/70 cursor-pointer' : 'bg-white/20'}`}>
      →
    </button>
  </div>
  <div class="text-center">
    <button onclick={() => scrollPage(1)} class={`p-2 w-10 h-10 rounded-full text-white transition-colors ${canScrollDown ? 'bg-black/70 cursor-pointer' : 'bg-white/20'}`}>
      ↓
    </button>
  </div>
</div>

<div class="fixed inset-x-0 bottom-0 z-40 flex justify-center">
  <div bind:this={bannerStripEl} class="grid grid-cols-2 bg-neutral-200 shadow-[0_-6px_20px_rgba(0,0,0,0.12)]" style="width: min(100vw, var(--slide-display-width));">
    {#each banners as banner}
      {#if banner.href}
        <a href={banner.href} class="block overflow-hidden bg-white" target="_blank" rel="noreferrer noopener">
          <img src={banner.imageUrl} alt="Banner" class="block h-auto w-full" loading="lazy" onload={syncBottomBannerHeight} />
        </a>
      {:else}
        <div class="overflow-hidden bg-white">
          <img src={banner.imageUrl} alt="Banner" class="block h-auto w-full" loading="lazy" onload={syncBottomBannerHeight} />
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  :global(:root) {
    --app-viewport-height: 100svh;
    --top-bar-height: 3.5rem;
    --bottom-banner-reserved-height: 4rem;
    --bottom-banner-height: 4rem;
    --slide-display-height: calc(var(--app-viewport-height) - var(--top-bar-height) - var(--bottom-banner-reserved-height));
    --slide-display-width: calc(var(--slide-display-height) * 9 / 16);
  }

  @media (min-width: 640px) {
    :global(:root) {
      --bottom-banner-reserved-height: 4.5rem;
      --bottom-banner-height: 4.5rem;
    }
  }

  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; overscroll-behavior: contain; }

  /* 高効率なダブルシェブロン（>>）スクロールアニメーション (GPU 処理のみを利用) */
  @keyframes chevron-bounce {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.3;
    }
    50% {
      transform: translateY(4px);
      opacity: 1;
    }
  }

  .animate-chevron-top {
    animation: chevron-bounce 1.6s infinite ease-in-out;
    will-change: transform, opacity;
  }

  .animate-chevron-bottom {
    animation: chevron-bounce 1.6s infinite ease-in-out;
    animation-delay: 0.25s; /* 時間差を作り、上から下へ流れる「>>」を表現 */
    will-change: transform, opacity;
  }
</style>