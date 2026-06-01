<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let src: string;
  export let isFirst: boolean = false; // ファーストビュー画像かどうかのフラグ

  const dispatch = createEventDispatcher<{ contentload: void }>();
</script>

<article class="relative flex h-[calc(100dvh-3.5rem)] w-full snap-start items-center justify-center overflow-hidden">
  <img 
    {src} 
    alt="Content" 
    class="relative z-10 h-full max-w-full aspect-9/16 object-cover shadow-2xl"
    loading={isFirst ? "eager" : "lazy"} 
    fetchpriority={isFirst ? "high" : "auto"}
    on:load={() => dispatch('contentload')}
  />
  
</article>