webpackJsonp([1],{0:function(t,n){},1:function(t,n){},"1/oy":function(t,n){},"1dnh":function(t,n,e){"use strict";var s=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",{staticClass:"trades"},[e("b-table",{attrs:{striped:"",hover:"",small:"",dark:"","head-variant":"dark",responsive:"",items:t.trades,fields:t.fields,"caption-top":"","sort-by":t.sortBy,"sort-desc":t.sortDesc},on:{"update:sortBy":function(n){t.sortBy=n},"update:sortDesc":function(n){t.sortDesc=n}},scopedSlots:t._u([{key:"commands",fn:function(n){return[e("b-button",{staticStyle:{height:"16px"},attrs:{size1:"sm"},on:{click:function(t){return t.stopPropagation(),n.toggleDetails(t)}}},[t._v("\n        "+t._s()+"\n      ")])]}},{key:"row-details",fn:function(n){return[e("b-card",[e("b-row",{staticClass:"mb-2"},[e("b-col",[e("b-button",{attrs:{size:"sm"},on:{click:n.toggleDetails}},[t._v("Go Manual")])],1)],1),t._v(" "),e("b-row",{staticClass:"mb-2"},[e("b-col",[e("b-button",{attrs:{size:"sm"},on:{click:n.toggleDetails}},[t._v("Sell Now")])],1)],1),t._v(" "),e("b-button",{attrs:{size:"sm"},on:{click:n.toggleDetails}},[t._v("End")])],1)]}}])},[e("template",{slot:"table-caption"},[t._v("\n      "+t._s(t.tradeType)+" Trades "+t._s(t.resume)+"\n    ")])],2)],1)},r=[],a={render:s,staticRenderFns:r};n.a=a},2:function(t,n){},"9M+g":function(t,n){},"9UN1":function(t,n,e){t.exports=e.p+"static/media/msn-online.7b5456c.mp3"},IGCF:function(t,n,e){t.exports=e.p+"static/media/plucky.a90b8d5.mp3"},Id91:function(t,n){},KXox:function(t,n){},LzYY:function(t,n){},M93x:function(t,n,e){"use strict";function s(t){e("baPM")}var r=e("xJD8"),a=e("TTtu"),o=e("VU/8"),i=s,c=o(r.a,a.a,!1,i,null,null);n.a=c.exports},NHnr:function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0});var s=e("/5sW"),r=e("e6fC"),a=e("qb6w"),o=(e.n(a),e("9M+g")),i=(e.n(o),e("M93x")),c=e("YaEn");s.a.use(r.a),s.a.config.productionTip=!1,new s.a({el:"#app",router:c.a,render:function(t){return t(i.a)}})},Oac0:function(t,n,e){"use strict";e.d(n,"b",function(){return f}),e.d(n,"c",function(){return d}),e.d(n,"d",function(){return p});var s=e("vzCy"),r=e.n(s),a=e("M0/D"),o=e.n(a),i=e("PJh5"),c=e.n(i),u=new r.a,l=void 0,m=void 0;setInterval(function(){return l&&u.emit("time",{start:l.format("HH:mm"),duration:l.fromNow(!0),details:m})},6e4);var f=function(t){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"HH:mm";return c()(new Date(t)).format(n)},d=function(t){return(+t).toFixed(8)},p=function(t){return(+t).toFixed(2)};n.a=u,function t(){var n=window.location.hostname,e=window.location.port,s=new o.a("ws://"+n+":"+2*e);s.on("connect",function(){u.emit("online")}),s.on("data",function(t){var n=JSON.parse(""+t);switch(n.type){case"trades":u.emit("trades",{trades:n.trades});break;case"time":l=c()(new Date(n.time)),u.emit("time",{start:f(n.time,"HH:mm  DD MMM"),duration:l.fromNow(!0),details:m=n.details});break;case"error":n.error.type="error",n.error.time=f(n.error.time),u.emit("srv_text",n.error);break;case"msg":n.error={type:"msg",time:f(n.msg.time),error:n.msg.msg},u.emit("srv_text",n.error)}}),s.on("close",function(){u.emit("offline"),setTimeout(t,0)}),s.on("error",function(t){s.destroy(t)})}()},TTtu:function(t,n,e){"use strict";var s=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("div",{attrs:{id:"app"}},[e("audio",{attrs:{src:t.sound,autoplay:"",controls1:""}}),t._v(" "),e("b-container",{attrs:{fluid:""}},[e("b-navbar",{attrs:{toggleable:"md",type:"dark",variant:"dark"}},[e("b-navbar-toggle",{attrs:{target:"nav_collapse"}}),t._v(" "),e("b-navbar-brand",{attrs:{to:"/"}},[e("b-img",{staticClass:"m24-logo",attrs:{src:t.logo}})],1),t._v(" "),e("b-navbar-nav",[e("b-nav-item",{attrs:{to:"open",type:"open"}},[t._v("Open")]),t._v(" "),e("b-nav-item",{attrs:{to:"closed"}},[t._v("Closed")]),t._v(" "),e("b-nav-item",{attrs:{to:"errors"}},[t._v("Errors\n          "),e("b-badge",{attrs:{variant:"danger"}},[t._v(t._s(t.errorsCount||""))])],1),t._v(" "),e("b-nav-item",{attrs:{to:"msg"}},[t._v("Messages\n          "),e("b-badge",{attrs:{variant:"info"}},[t._v(t._s(t.msgCount||""))])],1)],1),t._v(" "),e("b-navbar-nav",{staticClass:"ml-3"},[e("b-nav-text",{staticClass:"mr-1 info"},[t._v(t._s(t.startTime)+" ["+t._s(t.duration)+"]")])],1),t._v(" "),e("b-navbar-nav",{staticClass:"ml-auto"},[e("b-nav-text",[t._v(t._s(t.appDetails))])],1)],1),t._v(" "),e("router-view")],1)],1)},r=[],a={render:s,staticRenderFns:r};n.a=a},YaEn:function(t,n,e){"use strict";var s=e("/5sW"),r=e("/ocq"),a=e("cb8S"),o=e("pl3Q");s.a.use(r.a),n.a=new r.a({routes:[{path:"/",redirect:{name:"open"}},{path:"/open",name:"open",component:a.a,props:{type:"open"}},{path:"/closed",name:"closed",component:a.a,props:{type:"closed"}},{name:"errors",path:"/errors",component:o.a,props:{type:"error"}},{name:"msg",path:"/msg",component:o.a,props:{type:"msg"}}]})},baPM:function(t,n){},cb8S:function(t,n,e){"use strict";function s(t){e("vn24"),e("KXox")}var r=e("nAJz"),a=e("1dnh"),o=e("VU/8"),i=s,c=o(r.a,a.a,!1,i,"data-v-239c2726",null);n.a=c.exports},h9zC:function(t,n,e){t.exports=e.p+"static/img/m24_on.3638c19.gif"},lY77:function(t,n,e){"use strict";var s=e("M4fF"),r=e.n(s),a=e("Oac0");n.a={name:"Errors",props:["type"],data:function(){return{errors:[]}},computed:{infoStyle:function(){return"error"===this.type?"danger":"msg"}},methods:{reload:function(){this.errors=r.a.sortBy(this.errors,function(t){return t.view}),this.countErrors()},countErrors:function(){var t=r()(this.errors).filter(function(t){return!t.view}).sumBy("count");a.a.emit(this.type+"_count",t)}},watch:{type:function(){this.errors=a.a[this.type]||[]}},mounted:function(){var t=this;t.errors=a.a[t.type]||[],this.$nextTick(function(){a.a.on("srv_text",function(n){if(n.type===t.type){var e=r.a.find(t.errors,{error:n.error});e?(e.count++,e.timeframes.push(e.time),e.timeframe=r.a.first(e.timeframes)+" - "+r.a.last(e.timeframes)+" ["+e.count+"]"):t.errors.push({time:n.time,error:n.error,count:1,timeframe:n.time,timeframes:[n.time]}),a.a[t.type]=t.errors,t.countErrors()}})})}}},nAJz:function(t,n,e){"use strict";var s=e("woOf"),r=e.n(s),a=e("M4fF"),o=e.n(a),i=e("PJh5"),c=e.n(i),u=e("xHlr"),l=e.n(u),m=e("IGCF"),f=e.n(m),d=e("Oac0");n.a={name:"trades",props:["type"],data:function(){return{sound:null,allTrades:[],sortBy:"maxGain",sortDesc:!0,fields:[{key:"id",formatter:function(t,n,e){return t.replace(e.symbol,"")},sortable:!0,label:"#"},{key:"time",formatter:function(t){return e.i(d.b)(t)},sortable:!0},{key:"symbol",sortable:!0},{key:"buyPrice",formatter:d.c},{key:"sellPrice",formatter:d.c},{key:"lastPrice",formatter:d.c},{key:"minGain",formatter:d.d,sortable:!0},{key:"gainOrLoss",formatter:d.d,sortable:!0},{key:"maxGain",formatter:d.d,sortable:!0},{key:"target",formatter:d.d,sortable:!0},{key:"tradeDuration",formatter:function(t,n,e){return c.a.duration(Date.now()-e.time).humanize()}},{key:"rating",formatter:function(t){return t>.5?"Strong Buy":t>0?"Buy":0==+t?"":t<.5?"Strong Sell":t<0?" Sell":""},sortable:!0},"commands"]}},mounted:function(){var t=this;this.allTrades=d.a.allTrades||[],this.$nextTick(function(){t.listenToEvents()})},computed:{trades:function(){return o.a.filter(this.allTrades,{type:this.type})},tradeType:function(){return o.a.startCase(this.type)},resume:function(){if("closed"===this.type){var t=this.trades.length,n=o()(this.trades).filter(function(t){return t._moon_}).reject(function(t){return"danger"===t._moon_}).value().length,e=o()(this.trades).filter(function(t){return t._moon_}).filter(function(t){return"danger"===t._moon_}).value().length,s=n+e&&((n-e)/(n+e)).toFixed(2);if(s)return"Win: "+n+" Lost: "+e+" All: "+t+" Gain: "+s+"%"}return""}},watch:{type:function(){},trades:function(t,n){this.emitSound(t,n),this.setColor()}},methods:{setColor:function(){o.a.forEach(this.trades,function(t){return r()(t,{_cellVariants:{gainOrLoss:t.gainOrLoss<0?"danger":"success"},_rowVariant:function(){var n=void 0;return t.maxGain>=t.target?n="info":t.maxGain>=1?n="success":t.minGain<=t.stopPrice&&(n="danger"),n}()})})},emitSound:function(t,n){var e=t.length>n.length,s=t.length<n.length;this.sound=e?l.a:s?f.a:null},addTrades:function(t){var n=this,e=t.trades;this.allTrades=o.a.map(e,function(t){var e=o.a.find(n.allTrades,{id:t.id});return e?o.a.extend(e,t):o.a.extend({_showDetails:!1},t)}),d.a.allTrades=this.allTrades},listenToEvents:function(){d.a.on("trades",this.addTrades)}}}},pl3Q:function(t,n,e){"use strict";function s(t){e("LzYY")}var r=e("lY77"),a=e("tKFF"),o=e("VU/8"),i=s,c=o(r.a,a.a,!1,i,"data-v-1869b653",null);n.a=c.exports},qb6w:function(t,n){},sjAL:function(t,n,e){t.exports=e.p+"static/media/yahoo_door.fa1699b.mp3"},tKFF:function(t,n,e){"use strict";var s=function(){var t=this,n=t.$createElement,e=t._self._c||n;return e("b-list-group",{staticClass:"container-fluid"},t._l(t.errors,function(n,s){return e("b-list-group-item",{key:s,staticClass:"row",class:[n.view?"black":t.infoStyle],on:{click:[function(e){n.view=!0,t.reload()},function(n){if(!n.ctrlKey)return null;t.errors.splice(s,1)}]}},[e("strong",{staticClass:"col",attrs:{cols:"3",class1:t.type}},[t._v(t._s(n.timeframe))]),t._v(" "),e("span",{staticClass:"col errors",attrs:{cols:"9"}},[t._v(t._s(n.error))])])}))},r=[],a={render:s,staticRenderFns:r};n.a=a},uslO:function(t,n,e){function s(t){return e(r(t))}function r(t){var n=a[t];if(!(n+1))throw new Error("Cannot find module '"+t+"'.");return n}var a={"./af":"3CJN","./af.js":"3CJN","./ar":"3MVc","./ar-dz":"tkWw","./ar-dz.js":"tkWw","./ar-kw":"j8cJ","./ar-kw.js":"j8cJ","./ar-ly":"wPpW","./ar-ly.js":"wPpW","./ar-ma":"dURR","./ar-ma.js":"dURR","./ar-sa":"7OnE","./ar-sa.js":"7OnE","./ar-tn":"BEem","./ar-tn.js":"BEem","./ar.js":"3MVc","./az":"eHwN","./az.js":"eHwN","./be":"3hfc","./be.js":"3hfc","./bg":"lOED","./bg.js":"lOED","./bm":"hng5","./bm.js":"hng5","./bn":"aM0x","./bn.js":"aM0x","./bo":"w2Hs","./bo.js":"w2Hs","./br":"OSsP","./br.js":"OSsP","./bs":"aqvp","./bs.js":"aqvp","./ca":"wIgY","./ca.js":"wIgY","./cs":"ssxj","./cs.js":"ssxj","./cv":"N3vo","./cv.js":"N3vo","./cy":"ZFGz","./cy.js":"ZFGz","./da":"YBA/","./da.js":"YBA/","./de":"DOkx","./de-at":"8v14","./de-at.js":"8v14","./de-ch":"Frex","./de-ch.js":"Frex","./de.js":"DOkx","./dv":"rIuo","./dv.js":"rIuo","./el":"CFqe","./el.js":"CFqe","./en-au":"Sjoy","./en-au.js":"Sjoy","./en-ca":"Tqun","./en-ca.js":"Tqun","./en-gb":"hPuz","./en-gb.js":"hPuz","./en-ie":"ALEw","./en-ie.js":"ALEw","./en-il":"QZk1","./en-il.js":"QZk1","./en-nz":"dyB6","./en-nz.js":"dyB6","./eo":"Nd3h","./eo.js":"Nd3h","./es":"LT9G","./es-do":"7MHZ","./es-do.js":"7MHZ","./es-us":"INcR","./es-us.js":"INcR","./es.js":"LT9G","./et":"XlWM","./et.js":"XlWM","./eu":"sqLM","./eu.js":"sqLM","./fa":"2pmY","./fa.js":"2pmY","./fi":"nS2h","./fi.js":"nS2h","./fo":"OVPi","./fo.js":"OVPi","./fr":"tzHd","./fr-ca":"bXQP","./fr-ca.js":"bXQP","./fr-ch":"VK9h","./fr-ch.js":"VK9h","./fr.js":"tzHd","./fy":"g7KF","./fy.js":"g7KF","./gd":"nLOz","./gd.js":"nLOz","./gl":"FuaP","./gl.js":"FuaP","./gom-latn":"+27R","./gom-latn.js":"+27R","./gu":"rtsW","./gu.js":"rtsW","./he":"Nzt2","./he.js":"Nzt2","./hi":"ETHv","./hi.js":"ETHv","./hr":"V4qH","./hr.js":"V4qH","./hu":"xne+","./hu.js":"xne+","./hy-am":"GrS7","./hy-am.js":"GrS7","./id":"yRTJ","./id.js":"yRTJ","./is":"upln","./is.js":"upln","./it":"FKXc","./it.js":"FKXc","./ja":"ORgI","./ja.js":"ORgI","./jv":"JwiF","./jv.js":"JwiF","./ka":"RnJI","./ka.js":"RnJI","./kk":"j+vx","./kk.js":"j+vx","./km":"5j66","./km.js":"5j66","./kn":"gEQe","./kn.js":"gEQe","./ko":"eBB/","./ko.js":"eBB/","./ky":"6cf8","./ky.js":"6cf8","./lb":"z3hR","./lb.js":"z3hR","./lo":"nE8X","./lo.js":"nE8X","./lt":"/6P1","./lt.js":"/6P1","./lv":"jxEH","./lv.js":"jxEH","./me":"svD2","./me.js":"svD2","./mi":"gEU3","./mi.js":"gEU3","./mk":"Ab7C","./mk.js":"Ab7C","./ml":"oo1B","./ml.js":"oo1B","./mn":"CqHt","./mn.js":"CqHt","./mr":"5vPg","./mr.js":"5vPg","./ms":"ooba","./ms-my":"G++c","./ms-my.js":"G++c","./ms.js":"ooba","./mt":"oCzW","./mt.js":"oCzW","./my":"F+2e","./my.js":"F+2e","./nb":"FlzV","./nb.js":"FlzV","./ne":"/mhn","./ne.js":"/mhn","./nl":"3K28","./nl-be":"Bp2f","./nl-be.js":"Bp2f","./nl.js":"3K28","./nn":"C7av","./nn.js":"C7av","./pa-in":"pfs9","./pa-in.js":"pfs9","./pl":"7LV+","./pl.js":"7LV+","./pt":"ZoSI","./pt-br":"AoDM","./pt-br.js":"AoDM","./pt.js":"ZoSI","./ro":"wT5f","./ro.js":"wT5f","./ru":"ulq9","./ru.js":"ulq9","./sd":"fW1y","./sd.js":"fW1y","./se":"5Omq","./se.js":"5Omq","./si":"Lgqo","./si.js":"Lgqo","./sk":"OUMt","./sk.js":"OUMt","./sl":"2s1U","./sl.js":"2s1U","./sq":"V0td","./sq.js":"V0td","./sr":"f4W3","./sr-cyrl":"c1x4","./sr-cyrl.js":"c1x4","./sr.js":"f4W3","./ss":"7Q8x","./ss.js":"7Q8x","./sv":"Fpqq","./sv.js":"Fpqq","./sw":"DSXN","./sw.js":"DSXN","./ta":"+7/x","./ta.js":"+7/x","./te":"Nlnz","./te.js":"Nlnz","./tet":"gUgh","./tet.js":"gUgh","./tg":"5SNd","./tg.js":"5SNd","./th":"XzD+","./th.js":"XzD+","./tl-ph":"3LKG","./tl-ph.js":"3LKG","./tlh":"m7yE","./tlh.js":"m7yE","./tr":"k+5o","./tr.js":"k+5o","./tzl":"iNtv","./tzl.js":"iNtv","./tzm":"FRPF","./tzm-latn":"krPU","./tzm-latn.js":"krPU","./tzm.js":"FRPF","./ug-cn":"To0v","./ug-cn.js":"To0v","./uk":"ntHu","./uk.js":"ntHu","./ur":"uSe8","./ur.js":"uSe8","./uz":"XU1s","./uz-latn":"/bsm","./uz-latn.js":"/bsm","./uz.js":"XU1s","./vi":"0X8Q","./vi.js":"0X8Q","./x-pseudo":"e/KL","./x-pseudo.js":"e/KL","./yo":"YXlc","./yo.js":"YXlc","./zh-cn":"Vz2w","./zh-cn.js":"Vz2w","./zh-hk":"ZUyn","./zh-hk.js":"ZUyn","./zh-tw":"BbgG","./zh-tw.js":"BbgG"};s.keys=function(){return Object.keys(a)},s.resolve=r,t.exports=s,s.id="uslO"},vn24:function(t,n){},wm2f:function(t,n,e){t.exports=e.p+"static/img/m24_off.a6685f1.png"},xHlr:function(t,n,e){t.exports=e.p+"static/media/echoed-ding.4688366.mp3"},xJD8:function(t,n,e){"use strict";var s=e("h9zC"),r=e.n(s),a=e("wm2f"),o=e.n(a),i=e("9UN1"),c=e.n(i),u=e("sjAL"),l=e.n(u),m=e("Oac0");n.a={name:"app",data:function(){return{msg:"Bot Admin",startTime:"",duration:"",online:!1,errorsCount:"",msgCount:"",tradeResume:"",appDetails:""}},computed:{logo:function(){return this.online?r.a:o.a},sound:function(){return this.online?c.a:l.a}},mounted:function(){var t=this;this.$nextTick(function(){m.a.on("time",function(n){var e=n.start,s=n.duration,r=n.details;t.startTime=e,t.duration=s,t.appDetails=r}),m.a.on("offline",function(){t.online=!1}),m.a.on("online",function(){t.online=!0}),m.a.on("error_count",function(n){t.errorsCount=n}),m.a.on("msg_count",function(n){t.msgCount=n})})}}},zj2Q:function(t,n){}},["NHnr"]);
//# sourceMappingURL=app.7d20b89bfddb88803781.js.map