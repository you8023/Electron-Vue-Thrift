import Vue from 'vue'
class Api {
	static importThrift = () => {
    var thrift = require('thrift');
    var userService = require('./userService.js');
    var thriftConnection = thrift.createConnection('127.0.0.1', 8000);
    var thriftClient = thrift.createClient(userService,thriftConnection);

    thriftConnection.on("error",function(e){
      console.error(e);
    });
    return thriftClient;
  }
}
export default {
  install(Vue) {
    // Vue.prototype.$ajax = ajax;
    // Vue.prototype.$axios = axios;
    Vue.prototype.$api = Api;
    Vue.prototype.$thrift = Api.importThrift;
  }
}