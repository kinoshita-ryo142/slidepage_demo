<script lang="ts">
  export let src: string;
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
    loading="lazy" 
  />
  
</article>