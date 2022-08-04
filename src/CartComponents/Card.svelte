<script>
  import { get } from "svelte/store";
  import { cart } from "../Stores/stores.js";
  export let item;
  let { img, name, price } = item;
  img = `img/${img}`;
  const cartItems = get(cart);
  let inCart = cartItems[name] ? cartItems[name].count : 0;
  function addToCart() {
    inCart++;
    cart.update(n => {
      return { ...n, [name]: { ...item, count: inCart } };
    });
  }
</script>
<style>

.add-button {
    background-color: rgba(19,31,53,1);
    color: white;
}

.card{
    background-color: white;
    border: 0.5px solid gray;
}

    .card.product .btn {
  bottom: 1.5rem;
  max-width: 80%;
}

.price {
  font-size: 1.75rem;
}

@media (max-width: 768px) {
  .card-container {
    margin-bottom: 2rem;
  }
}
</style>


<div class="row px-2 pt-5">
      <div class="card text-center product p-4 pt-5 h-100 rounded">
        <img class="img-fluid d-block mx-auto" style="height:250px; width: 300px;" src={img} alt="Pilot Aviator Glasses Gear Image">
        <div class="card-body p-4 py-0 h-xs-440p">
          <h5 class="card-title font-weight-semi-bold mb-3 w-xl-220p mx-auto">{name}</h5>
          <p class="price">${price}</p>
          {#if inCart > 0}
          <p class="alert alert-info">
            <span>
              ( {inCart} in cart )
            </span>
          </p>
          {/if}
        </div>

        <p class="btn w-100 px-4 mx-auto">
          <input on:click={addToCart} type="submit" class="btn add-button btn-lg w-100" name="add-button" value="Add to Cart">
        </p>
      </div>
  </div>
