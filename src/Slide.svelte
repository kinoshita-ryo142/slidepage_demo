<script lang="ts">
  export let src: string;
  export let isFirst: boolean = false; // ファーストビュー画像かどうかのフラグ
</script>

<article class="relative flex h-[calc(100dvh-3.5rem)] w-full snap-start items-center justify-center overflow-hidden">
  
  <div 
    class="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl" 
    style="background-image: url({src});"
  ></div>

  <img 
    {src} 
    alt="Content" 
    class="relative z-10 h-full max-w-full aspect-9/16 object-cover shadow-2xl"
    loading={isFirst ? "eager" : "lazy"} 
    fetchpriority={isFirst ? "high" : "auto"}
  />
  
</article>