window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v89-DB68",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

/* DB68 keeps all automatic data refreshes at three minutes. */
(function(){
  "use strict";
  const minimumInterval=180000;
  let currentValue;
  const wrap=value=>{
    if(!value||typeof value!=="object")return value;
    const originalStart=typeof value.startLiveRefresh==="function"?value.startLiveRefresh.bind(value):null;
    return Object.freeze({
      ...value,
      LIVE_REFRESH_MS:minimumInterval,
      startLiveRefresh:originalStart
        ?(task,options={})=>originalStart(task,{...options,interval:Math.max(minimumInterval,Number(options.interval||0))})
        :value.startLiveRefresh
    });
  };
  const existing=window.MaxDockDB;
  const descriptor=Object.getOwnPropertyDescriptor(window,"MaxDockDB");
  if(descriptor&&!descriptor.configurable)return;
  currentValue=existing?wrap(existing):undefined;
  Object.defineProperty(window,"MaxDockDB",{
    configurable:true,
    enumerable:true,
    get(){return currentValue},
    set(value){currentValue=wrap(value)}
  });
})();

/* DB68 is the only release layout layer. No historical DB layout files are loaded. */
(function(){
  "use strict";
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);
  const version="89-db68";

  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=new URL(`maxdock-db68.css?v=${version}`,base).href;
  link.dataset.maxdockRelease="db68";
  document.head.appendChild(link);

  const initialize=()=>{
    if(document.querySelector('script[data-maxdock-release="db68"]'))return;
    const script=document.createElement("script");
    script.src=new URL(`maxdock-db68.js?v=${version}`,base).href;
    script.dataset.maxdockRelease="db68";
    script.async=false;
    script.addEventListener("load",()=>{
      document.documentElement.dataset.maxdockRelease="db68";
      document.querySelectorAll(".menu").forEach(menu=>{
        if(menu.querySelector(".maxdockReleaseStamp"))return;
        const stamp=document.createElement("small");
        stamp.className="maxdockReleaseStamp";
        stamp.textContent="DB68 · clean bootstrap and single-layout recovery active";
        menu.appendChild(stamp);
      });
    },{once:true});
    script.addEventListener("error",()=>console.error("MaxDock DB68 controller did not load."),{once:true});
    document.body.appendChild(script);
  };

  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
