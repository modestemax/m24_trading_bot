webpackJsonp([1],{"/192":function(t,s,n){"use strict";var e=function(){var t=this,s=t.$createElement,n=t._self._c||s;return n("div",{staticClass:"trades"},[n("b-table",{attrs:{striped:"",hover:"",items:t.trades,fields:t.fields}})],1)},r=[],a={render:e,staticRenderFns:r};s.a=a},0:function(t,s){},1:function(t,s){},"1/oy":function(t,s){},2:function(t,s){},"2OWI":function(t,s){},"3UOf":function(t,s){},"9M+g":function(t,s){},"9UN1":function(t,s,n){t.exports=n.p+"static/media/msn-online.7b5456c.mp3"},C0v9:function(t,s,n){"use strict";var e=function(){var t=this,s=t.$createElement,n=t._self._c||s;return n("div",[n("span",{staticClass:"time"},[t._v("Started at "+t._s(t.startTime)+"  ["+t._s(t.duration)+"]")]),t._v(" "),n("h3",{staticClass:"float-right pr-3 card-title"},[t._v(t._s(t.msg))])])},r=[],a={render:e,staticRenderFns:r};s.a=a},IGCF:function(t,s,n){t.exports=n.p+"static/media/plucky.a90b8d5.mp3"},Id91:function(t,s){},M93x:function(t,s,n){"use strict";function e(t){n("2OWI")}var r=n("xJD8"),a=n("bkJ1"),o=n("VU/8"),i=e,u=o(r.a,a.a,!1,i,null,null);s.a=u.exports},NHnr:function(t,s,n){"use strict";Object.defineProperty(s,"__esModule",{value:!0});var e=n("/5sW"),r=n("e6fC"),a=n("qb6w"),o=(n.n(a),n("9M+g")),i=(n.n(o),n("M93x")),u=n("YaEn");e.a.use(r.a),e.a.config.productionTip=!1,new e.a({el:"#app",router:u.a,render:function(t){return t(i.a)}})},Oac0:function(t,s,n){"use strict";var e=n("vzCy"),r=n.n(e),a=n("M0/D"),o=n.n(a),i=n("PJh5"),u=n.n(i),c=n("M4fF"),d=n.n(c),l=new r.a,f=void 0;setInterval(function(){return l.emit("time",{start:f.format("HH:mm"),duration:f.fromNow(!0)})},6e4);var m=function(t,s){return u()(new Date(t)).format(s||"HH:mm")};s.a=l,function t(){var s=window.location.hostname,n=window.location.port,e=new o.a("ws://"+s+":"+2*n);e.on("connect",function(){l.emit("online")}),e.on("data",function(t){var s=JSON.parse(""+t),n=s.trade;switch(n&&(s.trades=[n]),d.a.forEach(s.trades,function(t){d.a.extend(t,{time:m(t.time)})}),s.type){case"trades":l.emit("trades",s);break;case"time":f=u()(new Date(s.time)),l.emit("time",{start:m(s.time,"HH:mm  DD MMM"),duration:f.fromNow(!0)});break;case"error":s.error.time=m(s.error.time),l.emit("error",s.error);break;case"trade_start":l.emit("trade_start",s.trade);break;case"trade_update":l.emit("trade_update",s.trade);break;case"trade_end":l.emit("trade_end",s.trade);break;case"trade_change":l.emit("trade_change",s.trade)}}),e.on("close",function(){l.emit("offline"),setTimeout(t,0)}),e.on("error",function(t){e.destroy(t)})}()},UpyN:function(t,s,n){"use strict";var e=function(){var t=this,s=t.$createElement,n=t._self._c||s;return n("b-list-group",{staticClass:"container-fluid"},t._l(t.errors,function(s,e){return n("b-list-group-item",{key:e,staticClass:"row",class:[s.view?"black":"danger"],on:{click:[function(n){s.view=!0,t.reload()},function(s){if(!s.ctrlKey)return null;t.errors.splice(e,1)}]}},[n("strong",{staticClass:"col error",attrs:{cols:"3"}},[t._v(t._s(s.timeframe))]),t._v(" "),n("span",{staticClass:"col errors",attrs:{cols:"9"}},[t._v(t._s(s.error))])])}))},r=[],a={render:e,staticRenderFns:r};s.a=a},YaEn:function(t,s,n){"use strict";var e=n("/5sW"),r=n("/ocq"),a=n("qSdX"),o=n("cb8S"),i=n("pl3Q");e.a.use(r.a),s.a=new r.a({routes:[{path:"/",name:"M24",components:{Hello:a.a,Trades:o.a,Errors:i.a}}]})},bkJ1:function(t,s,n){"use strict";var e=function(){var t=this,s=t.$createElement,n=t._self._c||s;return n("div",{attrs:{id:"app"}},[n("div",{staticClass:"pb-5"},[n("img",{staticClass:"m24-logo",attrs:{src:t.logo}}),t._v(" "),n("audio",{attrs:{src:t.sound,autoplay:"",controls1:""}}),t._v(" "),n("router-view",{attrs:{name:"Hello"}})],1),t._v(" "),n("b-container",{attrs:{fluid:""}},[n("b-tabs",{attrs:{pills:"",card:"",vertical1:""}},[n("b-tab",{staticClass:"trades",attrs:{title:"Trades"}},[n("template",{slot:"title"},[t._v("\n          Trades\n          "),n("b-badge",{attrs:{pill:"",variant:"warning"}},[t._v(t._s(t.tradeResume))])],1),t._v(" "),n("router-view",{attrs:{name:"Trades"}})],2),t._v(" "),n("b-tab",{staticClass:"errors",attrs:{title:"Errors"}},[n("template",{slot:"title"},[t._v("\n          Errors\n          "),n("b-badge",{attrs:{pill:"",variant:"danger"}},[t._v(t._s(t.errorsCount||""))])],1),t._v(" "),n("router-view",{attrs:{name:"Errors"}})],2)],1)],1)],1)},r=[],a={render:e,staticRenderFns:r};s.a=a},cb8S:function(t,s,n){"use strict";function e(t){n("3UOf"),n("iT3u")}var r=n("nAJz"),a=n("/192"),o=n("VU/8"),i=e,u=o(r.a,a.a,!1,i,"data-v-794972f8",null);s.a=u.exports},h9zC:function(t,s,n){t.exports=n.p+"static/img/m24_on.3638c19.gif"},iT3u:function(t,s){},j0PT:function(t,s){},lY77:function(t,s,n){"use strict";var e=n("M4fF"),r=n.n(e),a=n("Oac0");s.a={name:"Errors",data:function(){return{errors:[]}},computed:{},methods:{reload:function(){this.errors=r.a.sortBy(this.errors,function(t){return t.view}),this.countErrors()},countErrors:function(){var t=r()(this.errors).filter(function(t){return!t.view}).sumBy("count");a.a.emit("error_count",t)}},mounted:function(){var t=this;this.$nextTick(function(){a.a.on("error",function(s){var n=r.a.find(t.errors,{error:s.error});n?(n.count++,n.timeframes.push(n.time),n.timeframe=r.a.first(n.timeframes)+" - "+r.a.last(n.timeframes)+" ["+n.count+"]"):t.errors.push({time:s.time,error:s.error,count:1,timeframe:s.time,timeframes:[s.time]}),t.countErrors()})})}}},nAJz:function(t,s,n){"use strict";var e=n("M4fF"),r=n.n(e),a=n("xHlr"),o=n.n(a),i=n("IGCF"),u=n.n(i),c=n("Oac0");s.a={name:"trades",data:function(){return{sound:null,trades:[],fields:["time","symbol","buyPrice","sellPrice","lastPrice","minGain","gainOrLoss","maxGain","target","tradeDuration","update"]}},mounted:function(){var t=this;this.$nextTick(function(){t.listenToEvents()})},methods:{addTrade:function(t){r.a.extend(t,{tradeDuration:t.effectiveDuration||t.tradeDuration}),this.trades=this.trades.concat(t).sort(function(t){return t.timestamp}),this.sendResume()},endTrade:function(t){this.trades.splice(r.a.findIndex(this.trades,function(s){return s.symbol===t.symbol}),1)},changeTrade:function(t){var s=r.a.find(this.trades,function(s){return s.symbol===t.symbol});r.a.extend(s,t),this.trades=[].concat(this.trades),this.sendResume()},addTrades:function(t){var s=t.trades,n=t.start,e=t.end,a=this;a.sound=n?o.a:null,a.sound=a.sound||(e?u.a:null),r.a.values(s)>r.a.values(a.trades)?a.sound=o.a:r.a.values(s)<r.a.values(a.trades)?a.sound=u.a:a.sound=null,a.trades=r.a.values(s)},listenToEvents:function(){c.a.on("trades",this.addTrades),c.a.on("trade_start",this.addTrade),c.a.on("trade_change",this.changeTrade)},sendResume:function(){var t=this.trades.length,s=r()(this.trades).filter(function(t){return t._moon_}).reject(function(t){return"danger"===t._moon_}).value().length,n=r()(this.trades).filter(function(t){return t._moon_}).filter(function(t){return"danger"===t._moon_}).value().length,e=s+n&&((s-n)/(s+n)).toFixed(2);c.a.emit("trade_resume","Win: "+s+" Lost: "+n+" All: "+t+" Gain: "+e+"%")}}}},pMZz:function(t,s,n){"use strict";var e=n("Oac0");s.a={name:"hello",data:function(){return{msg:"Bot Admin",startTime:"",duration:""}},mounted:function(){var t=this;this.$nextTick(function(){e.a.on("time",function(s){var n=s.start,e=s.duration;t.startTime=n,t.duration=e})})}}},pl3Q:function(t,s,n){"use strict";function e(t){n("ySne")}var r=n("lY77"),a=n("UpyN"),o=n("VU/8"),i=e,u=o(r.a,a.a,!1,i,"data-v-2738729b",null);s.a=u.exports},qSdX:function(t,s,n){"use strict";function e(t){n("j0PT")}var r=n("pMZz"),a=n("C0v9"),o=n("VU/8"),i=e,u=o(r.a,a.a,!1,i,"data-v-fe462fa4",null);s.a=u.exports},qb6w:function(t,s){},sjAL:function(t,s,n){t.exports=n.p+"static/media/yahoo_door.fa1699b.mp3"},uslO:function(t,s,n){function e(t){return n(r(t))}function r(t){var s=a[t];if(!(s+1))throw new Error("Cannot find module '"+t+"'.");return s}var a={"./af":"3CJN","./af.js":"3CJN","./ar":"3MVc","./ar-dz":"tkWw","./ar-dz.js":"tkWw","./ar-kw":"j8cJ","./ar-kw.js":"j8cJ","./ar-ly":"wPpW","./ar-ly.js":"wPpW","./ar-ma":"dURR","./ar-ma.js":"dURR","./ar-sa":"7OnE","./ar-sa.js":"7OnE","./ar-tn":"BEem","./ar-tn.js":"BEem","./ar.js":"3MVc","./az":"eHwN","./az.js":"eHwN","./be":"3hfc","./be.js":"3hfc","./bg":"lOED","./bg.js":"lOED","./bm":"hng5","./bm.js":"hng5","./bn":"aM0x","./bn.js":"aM0x","./bo":"w2Hs","./bo.js":"w2Hs","./br":"OSsP","./br.js":"OSsP","./bs":"aqvp","./bs.js":"aqvp","./ca":"wIgY","./ca.js":"wIgY","./cs":"ssxj","./cs.js":"ssxj","./cv":"N3vo","./cv.js":"N3vo","./cy":"ZFGz","./cy.js":"ZFGz","./da":"YBA/","./da.js":"YBA/","./de":"DOkx","./de-at":"8v14","./de-at.js":"8v14","./de-ch":"Frex","./de-ch.js":"Frex","./de.js":"DOkx","./dv":"rIuo","./dv.js":"rIuo","./el":"CFqe","./el.js":"CFqe","./en-au":"Sjoy","./en-au.js":"Sjoy","./en-ca":"Tqun","./en-ca.js":"Tqun","./en-gb":"hPuz","./en-gb.js":"hPuz","./en-ie":"ALEw","./en-ie.js":"ALEw","./en-il":"QZk1","./en-il.js":"QZk1","./en-nz":"dyB6","./en-nz.js":"dyB6","./eo":"Nd3h","./eo.js":"Nd3h","./es":"LT9G","./es-do":"7MHZ","./es-do.js":"7MHZ","./es-us":"INcR","./es-us.js":"INcR","./es.js":"LT9G","./et":"XlWM","./et.js":"XlWM","./eu":"sqLM","./eu.js":"sqLM","./fa":"2pmY","./fa.js":"2pmY","./fi":"nS2h","./fi.js":"nS2h","./fo":"OVPi","./fo.js":"OVPi","./fr":"tzHd","./fr-ca":"bXQP","./fr-ca.js":"bXQP","./fr-ch":"VK9h","./fr-ch.js":"VK9h","./fr.js":"tzHd","./fy":"g7KF","./fy.js":"g7KF","./gd":"nLOz","./gd.js":"nLOz","./gl":"FuaP","./gl.js":"FuaP","./gom-latn":"+27R","./gom-latn.js":"+27R","./gu":"rtsW","./gu.js":"rtsW","./he":"Nzt2","./he.js":"Nzt2","./hi":"ETHv","./hi.js":"ETHv","./hr":"V4qH","./hr.js":"V4qH","./hu":"xne+","./hu.js":"xne+","./hy-am":"GrS7","./hy-am.js":"GrS7","./id":"yRTJ","./id.js":"yRTJ","./is":"upln","./is.js":"upln","./it":"FKXc","./it.js":"FKXc","./ja":"ORgI","./ja.js":"ORgI","./jv":"JwiF","./jv.js":"JwiF","./ka":"RnJI","./ka.js":"RnJI","./kk":"j+vx","./kk.js":"j+vx","./km":"5j66","./km.js":"5j66","./kn":"gEQe","./kn.js":"gEQe","./ko":"eBB/","./ko.js":"eBB/","./ky":"6cf8","./ky.js":"6cf8","./lb":"z3hR","./lb.js":"z3hR","./lo":"nE8X","./lo.js":"nE8X","./lt":"/6P1","./lt.js":"/6P1","./lv":"jxEH","./lv.js":"jxEH","./me":"svD2","./me.js":"svD2","./mi":"gEU3","./mi.js":"gEU3","./mk":"Ab7C","./mk.js":"Ab7C","./ml":"oo1B","./ml.js":"oo1B","./mn":"CqHt","./mn.js":"CqHt","./mr":"5vPg","./mr.js":"5vPg","./ms":"ooba","./ms-my":"G++c","./ms-my.js":"G++c","./ms.js":"ooba","./mt":"oCzW","./mt.js":"oCzW","./my":"F+2e","./my.js":"F+2e","./nb":"FlzV","./nb.js":"FlzV","./ne":"/mhn","./ne.js":"/mhn","./nl":"3K28","./nl-be":"Bp2f","./nl-be.js":"Bp2f","./nl.js":"3K28","./nn":"C7av","./nn.js":"C7av","./pa-in":"pfs9","./pa-in.js":"pfs9","./pl":"7LV+","./pl.js":"7LV+","./pt":"ZoSI","./pt-br":"AoDM","./pt-br.js":"AoDM","./pt.js":"ZoSI","./ro":"wT5f","./ro.js":"wT5f","./ru":"ulq9","./ru.js":"ulq9","./sd":"fW1y","./sd.js":"fW1y","./se":"5Omq","./se.js":"5Omq","./si":"Lgqo","./si.js":"Lgqo","./sk":"OUMt","./sk.js":"OUMt","./sl":"2s1U","./sl.js":"2s1U","./sq":"V0td","./sq.js":"V0td","./sr":"f4W3","./sr-cyrl":"c1x4","./sr-cyrl.js":"c1x4","./sr.js":"f4W3","./ss":"7Q8x","./ss.js":"7Q8x","./sv":"Fpqq","./sv.js":"Fpqq","./sw":"DSXN","./sw.js":"DSXN","./ta":"+7/x","./ta.js":"+7/x","./te":"Nlnz","./te.js":"Nlnz","./tet":"gUgh","./tet.js":"gUgh","./tg":"5SNd","./tg.js":"5SNd","./th":"XzD+","./th.js":"XzD+","./tl-ph":"3LKG","./tl-ph.js":"3LKG","./tlh":"m7yE","./tlh.js":"m7yE","./tr":"k+5o","./tr.js":"k+5o","./tzl":"iNtv","./tzl.js":"iNtv","./tzm":"FRPF","./tzm-latn":"krPU","./tzm-latn.js":"krPU","./tzm.js":"FRPF","./ug-cn":"To0v","./ug-cn.js":"To0v","./uk":"ntHu","./uk.js":"ntHu","./ur":"uSe8","./ur.js":"uSe8","./uz":"XU1s","./uz-latn":"/bsm","./uz-latn.js":"/bsm","./uz.js":"XU1s","./vi":"0X8Q","./vi.js":"0X8Q","./x-pseudo":"e/KL","./x-pseudo.js":"e/KL","./yo":"YXlc","./yo.js":"YXlc","./zh-cn":"Vz2w","./zh-cn.js":"Vz2w","./zh-hk":"ZUyn","./zh-hk.js":"ZUyn","./zh-tw":"BbgG","./zh-tw.js":"BbgG"};e.keys=function(){return Object.keys(a)},e.resolve=r,t.exports=e,e.id="uslO"},wm2f:function(t,s,n){t.exports=n.p+"static/img/m24_off.a6685f1.png"},xHlr:function(t,s,n){t.exports=n.p+"static/media/echoed-ding.4688366.mp3"},xJD8:function(t,s,n){"use strict";var e=n("h9zC"),r=n.n(e),a=n("wm2f"),o=n.n(a),i=n("9UN1"),u=n.n(i),c=n("sjAL"),d=n.n(c),l=n("Oac0");s.a={name:"app",data:function(){return{online:!1,errorsCount:"",tradeResume:""}},computed:{logo:function(){return this.online?r.a:o.a},sound:function(){return this.online?u.a:d.a}},mounted:function(){var t=this;this.$nextTick(function(){l.a.on("offline",function(){t.online=!1}),l.a.on("online",function(){t.online=!0}),l.a.on("error_count",function(s){t.errorsCount=s}),l.a.on("trade_resume",function(s){t.tradeResume=s})})}}},ySne:function(t,s){},zj2Q:function(t,s){}},["NHnr"]);
//# sourceMappingURL=app.f8f4917ba662ef0f2ba1.js.map