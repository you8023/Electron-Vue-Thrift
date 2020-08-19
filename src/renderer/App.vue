<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
  import Vue from 'vue'
  export default {
    name: 'nb',
    created(){
      Vue.prototype.$thriftClient = this.$thrift();
    }
  }
</script>

<style>
  /* CSS */
</style>
