<style>
.section-header {
    background-color: rgba(19,31,53,1);
    color: white;
}

.form-inputs{
    position:relative;
}
.form-inputs .form-control{
    height:45px;
}

.form-inputs .form-control:focus{
    box-shadow:none;
    border:1px solid #000;
}

.form-inputs i{
    position:absolute;
    right:10px;
    top:15px;
}

.shop-bag{
    background-color:#fff;
    color:#fff;
    height:50px;
    width:50px;
    font-size:25px;
    display:flex;
    border-radius:50%;
    align-items:center;
    justify-content:center;
}

.qty{
    font-size:12px;
}
</style>
<script>
    import { cart } from "../Stores/stores.js";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    let cart_sum = 0;
    const unsubscribe = cart.subscribe(items => {
      const itemValues = Object.values(items);
      cart_sum = 0;
      itemValues.forEach(item => {
        cart_sum += item.count;
      });
    });
    function goToHome() {
      dispatch("nav", {
        option: "home"
      });
    }
    function goToCheckout() {
      dispatch("nav", {
        option: "checkout"
      });
    }
  </script>

<header class="section-header mb-4 rounded">
    <section class="header-main" >
        <div class="container-fluid">
           <div class="row p-2 pt-3 pb-3 d-flex align-items-center">
               <div class="col-md-2">
                   <h4 style="cursor: pointer;" on:click={goToHome}>Svelte Cart Demo</h4>
               </div>
               <div class="col-md-8">
            <div class="d-flex form-inputs">
            <input class="form-control" type="text" placeholder="Search any product...">
            <i class="bx bx-search"></i>
            </div>
               </div>

               <div class="col-md-2">
                   <div class="d-flex d-none d-md-flex flex-row align-items-center">
                       <span class="shop-bag mr-2"><i on:click={goToCheckout} style="color:rgba(19,31,53,1); cursor: pointer;" class='bx bxs-shopping-bag'></i></span>
                       <div class="d-flex flex-column ms-2">
                           <span class="qty">{cart_sum} Product(s)</span>
                           <span class="fw-bold">$ {cart_sum * 100}</span>
                       </div>
                   </div>
               </div>
           </div>
        </div>
    </section>
    </header>
