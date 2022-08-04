<script>
  import Card from "./Card.svelte";
  import items from "../items.js";
</script>

<div class="container mb-4">
  <div class="row">


    {#each items as item}
    <div class="col-md-4">

    <Card {item} />
  </div>
  {/each}
 </div> </div>
