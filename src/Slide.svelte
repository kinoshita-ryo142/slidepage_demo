<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let src: string;
  export let isFirst: boolean = false; // ファーストビュー画像かどうかのフラグ

  const dispatch = createEventDispatcher<{ contentload: void }>();
</script>

<article class="relative flex w-full snap-start items-center justify-center overflow-hidden" style="height: var(--slide-display-height);">
  <img 
    {src} 
    alt="Content" 
    class="relative z-10 h-full max-w-full object-cover shadow-2xl"
    style="width: min(100vw, var(--slide-display-width));"
    loading={isFirst ? "eager" : "lazy"} 
    fetchpriority={isFirst ? "high" : "auto"}
    on:load={() => dispatch('contentload')}
  />
  
</article>