webpackJsonp([1],{0:function(t,n){},1:function(t,n){},"1/oy":function(t,n){},2:function(t,n){},"9M+g":function(t,n){},"9UN1":function(t,n,e){t.exports=e.p+"static/media/msn-online.7b5456c.mp3"},CzaY:function(t,n){},"Hx+/":function(t,n,e){"use strict";var a=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",[e("h3",{staticClass:"float-right pr-3 card-title"},[t._v(t._s(t.msg))])])},r=[],s={render:a,staticRenderFns:r};n.a=s},IGCF:function(t,n,e){t.exports=e.p+"static/media/plucky.a90b8d5.mp3"},Id91:function(t,n){},M93x:function(t,n,e){"use strict";function a(t){e("kqCG")}var r=e("xJD8"),s=e("iKPj"),i=e("VU/8"),o=a,c=i(r.a,s.a,!1,o,null,null);n.a=c.exports},NHnr:function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0});var a=e("/5sW"),r=e("e6fC"),s=e("qb6w"),i=(e.n(s),e("9M+g")),o=(e.n(i),e("M93x")),c=e("YaEn");a.a.use(r.a),a.a.config.productionTip=!1,new a.a({el:"#app",router:c.a,render:function(t){return t(o.a)}})},Oac0:function(t,n,e){"use strict";var a=e("vzCy"),r=e.n(a),s=e("M0/D"),i=e.n(s),o=new r.a;n.a=o,function t(){var n=window.location.hostname,e=new i.a("ws://"+n+":12345");e.on("connect",function(){o.emit("online")}),e.on("data",function(t){var n=JSON.parse(""+t);switch(n.type){case"trades":o.emit("trades",n);break;case"error":o.emit("error",n.error)}}),e.on("close",function(){o.emit("offline"),setTimeout(t,0)}),e.on("error",function(t){e.destroy(t)})}()},Ql2P:function(t,n){},YaEn:function(t,n,e){"use strict";var a=e("/5sW"),r=e("/ocq"),s=e("qSdX"),i=e("cb8S"),o=e("pl3Q");a.a.use(r.a),n.a=new r.a({routes:[{path:"/",name:"M24",components:{Hello:s.a,Trades:i.a,Errors:o.a}}]})},cb8S:function(t,n,e){"use strict";function a(t){e("CzaY")}var r=e("nAJz"),s=e("woYZ"),i=e("VU/8"),o=a,c=i(r.a,s.a,!1,o,"data-v-6c5e7a16",null);n.a=c.exports},h9zC:function(t,n,e){t.exports=e.p+"static/img/m24_on.3638c19.gif"},iKPj:function(t,n,e){"use strict";var a=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",{attrs:{id:"app"}},[e("div",{staticClass:"pb-5"},[e("img",{staticClass:"m24-logo",attrs:{src:t.logo}}),t._v(" "),e("audio",{attrs:{src:t.sound,autoplay:"",controls1:""}}),t._v(" "),e("router-view",{attrs:{name:"Hello"}})],1),t._v(" "),e("b-card-group",{staticClass:"px-3",attrs:{deck:"",cols:"7"}},[e("b-card",{staticClass:"trades",attrs:{title:"Trades"}},[e("router-view",{attrs:{name:"Trades"}})],1),t._v(" "),e("b-card",{staticClass:"errors",attrs:{"no-body":"",header:"<b>Errors</b>"}},[e("router-view",{attrs:{name:"Errors"}})],1)],1)],1)},r=[],s={render:a,staticRenderFns:r};n.a=s},kqCG:function(t,n){},lY77:function(t,n,e){"use strict";var a=e("Oac0"),r=function(){return(new Date).toTimeString().split(":").slice(0,2).join("H ")};n.a={name:"Errors",data:function(){return{errors:[]}},computed:{},mounted:function(){var t=this;this.$nextTick(function(){a.a.on("error",function(n){t.errors.unshift({time:r(),error:n})})})}}},nAJz:function(t,n,e){"use strict";var a=e("M4fF"),r=e.n(a),s=e("xHlr"),i=e.n(s),o=e("IGCF"),c=e.n(o),u=e("Oac0"),f=function(t){return new Date(t).toTimeString().split(":").slice(0,2).join("H")},l=function(t){return(+t).toFixed(2)+"%"};n.a={name:"trades",data:function(){return{sound:null,trades:[],fields:["time","symbol","minGain","gainOrLoss","maxGain","stopPercent","tradeDuration"]}},mounted:function(){var t=this;this.$nextTick(function(){u.a.on("trades",function(n){var e=n.trades,a=n.start,s=n.end;t.sound=a?i.a:null,t.sound=t.sound||(s?c.a:null),r.a.values(e)>r.a.values(t.trades)?t.sound=i.a:r.a.values(e)<r.a.values(t.trades)?t.sound=c.a:t.sound=null,t.trades=r.a.values(e).map(function(t){return r.a.extend(t,{time:f(t.timestamp),minGain:l(t.minGain),gainOrLoss:l(t.gainOrLoss),maxGain:l(t.maxGain),stopPercent:l(t.stopPercent)})})})})}}},pMZz:function(t,n,e){"use strict";n.a={name:"hello",data:function(){return{msg:"Bot Admin"}}}},pl3Q:function(t,n,e){"use strict";function a(t){e("sMG5")}var r=e("lY77"),s=e("zQCe"),i=e("VU/8"),o=a,c=i(r.a,s.a,!1,o,"data-v-56514782",null);n.a=c.exports},qSdX:function(t,n,e){"use strict";function a(t){e("Ql2P")}var r=e("pMZz"),s=e("Hx+/"),i=e("VU/8"),o=a,c=i(r.a,s.a,!1,o,"data-v-668e97ef",null);n.a=c.exports},qb6w:function(t,n){},sMG5:function(t,n){},sjAL:function(t,n,e){t.exports=e.p+"static/media/yahoo_door.fa1699b.mp3"},wm2f:function(t,n,e){t.exports=e.p+"static/img/m24_off.a6685f1.png"},woYZ:function(t,n,e){"use strict";var a=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",{staticClass:"trades"},[e("b-table",{attrs:{striped:"",hover:"",items:t.trades,fields:t.fields}})],1)},r=[],s={render:a,staticRenderFns:r};n.a=s},xHlr:function(t,n,e){t.exports=e.p+"static/media/echoed-ding.4688366.mp3"},xJD8:function(t,n,e){"use strict";var a=e("h9zC"),r=e.n(a),s=e("wm2f"),i=e.n(s),o=e("9UN1"),c=e.n(o),u=e("sjAL"),f=e.n(u),l=e("Oac0");n.a={name:"app",data:function(){return{online:!1}},computed:{logo:function(){return this.online?r.a:i.a},sound:function(){return this.online?c.a:f.a}},mounted:function(){var t=this;this.$nextTick(function(){l.a.on("offline",function(){t.online=!1}),l.a.on("online",function(){t.online=!0})})}}},zQCe:function(t,n,e){"use strict";var a=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("b-list-group",t._l(t.errors,function(n,a){return e("b-list-group-item",{key:a,staticClass:"danger"},[e("span",{staticClass:"error"},[t._v(t._s(n.time))]),t._v(" "),e("div",{staticClass:"errors"},[t._v(t._s(n.error))])])}))},r=[],s={render:a,staticRenderFns:r};n.a=s},zj2Q:function(t,n){}},["NHnr"]);
//# sourceMappingURL=app.777309a98a4d4038b6ec.js.map