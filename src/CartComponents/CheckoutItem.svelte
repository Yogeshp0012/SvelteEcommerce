<script>
    import { cart } from "../Stores/stores.js";
    export let item;
    let { name, price, img, count } = item;
    const countButtonHandler = e => {
      if (e.target.classList.contains("add")) {
        count++;
      } else if (count >= 1) {
        count--;
      }
      cart.update(n => ({ ...n, [name]: { ...n[name], count } }));
    };
    const removeItem = () => {
      cart.update(n => {
        delete n[name];
        return n;
      });
    };
  </script>



  <div class="row">
    <img class="img-fluid img-thumbnail" width="300" src={`img/${img}`} alt={name} />
    <div class="item-meta-data ml-2">
      <h3 class="title">{name}</h3>
      <p class="price mb-2">Price: $ {price}</p>
      <span class="mt-2 p-0 mb-2">No(s): {count}</span> {' '}
      <div class="col p-0 mt-2">
        <button type="button" class="btn btn-success add" on:click={countButtonHandler}>Add More</button> {' '}
        <button type="button" class="btn btn-danger" on:click={removeItem}>
            Remove
          </button>
      </div>
    </div>
  </div>
