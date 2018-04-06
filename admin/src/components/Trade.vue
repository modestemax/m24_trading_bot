<template>
 <div>
   <span class="time pr-1"> {{trade.time}}</span>
   <span class="symbol pr-1"> {{trade.symbol}}</span>
   <span class="price pr-1"> {{trade.price}}</span>
   <span class="gainOrLoss pr-1"> {{trade.gainOrLoss}}</span>
 </div>
</template>

<script>
  export default {
    name: 'trade',
    props: ['trade'],
    data() {
      return {
        msg: 'trade1',
      };
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .time{

  }
</style>
