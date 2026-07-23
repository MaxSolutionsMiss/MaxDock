window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v87-DB66",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

/* DB62 refresh policy is installed before maxdock-db.js so all page timers use three minutes. */
(function(){
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

(function(){
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);
  const loadCss=(file,version,release)=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=new URL(`${file}?v=${version}`,base).href;
    link.dataset.maxdockRelease=release;
    document.head.appendChild(link);
  };
  const loadScript=(file,version,release)=>new Promise(resolve=>{
    const existing=document.querySelector(`script[data-maxdock-release="${release}"]`);
    if(existing){resolve();return}
    const script=document.createElement("script");
    script.src=new URL(`${file}?v=${version}`,base).href;
    script.dataset.maxdockRelease=release;
    script.async=false;
    script.addEventListener("load",resolve,{once:true});
    script.addEventListener("error",()=>{console.warn(`MaxDock ${release} asset did not load.`);resolve()},{once:true});
    document.body.appendChild(script);
  });

  loadCss("maxdock-db33.css","87-db66","db33");
  loadCss("maxdock-db34.css","87-db66","db34");
  loadCss("maxdock-db35.css","87-db66","db35");
  loadCss("maxdock-db36.css","87-db66","db36");
  loadCss("maxdock-db38.css","87-db66","db38");
  loadCss("maxdock-db39.css","87-db66","db39");
  loadCss("maxdock-db40.css","87-db66","db40");
  loadCss("maxdock-db41.css","87-db66","db41");
  loadCss("maxdock-db42.css","87-db66","db42");
  loadCss("maxdock-db43.css","87-db66","db43");
  loadCss("maxdock-db44.css","87-db66","db44");
  loadCss("maxdock-db45.css","87-db66","db45");
  loadCss("maxdock-db46.css","87-db66","db46");
  loadCss("maxdock-db47.css","87-db66","db47");
  loadCss("maxdock-db47-polish.css","87-db66","db47-polish");
  loadCss("maxdock-db48.css","87-db66","db48");
  loadCss("maxdock-db49.css","87-db66","db49");
  loadCss("maxdock-db50.css","87-db66","db50");
  loadCss("maxdock-db51.css","87-db66","db51");
  loadCss("maxdock-db52.css","87-db66","db52");
  loadCss("maxdock-db53.css","87-db66","db53");
  loadCss("maxdock-db54.css","87-db66","db54");
  loadCss("maxdock-db55.css","87-db66","db55");
  loadCss("maxdock-db56.css","87-db66","db56");
  loadCss("maxdock-db57.css","87-db66","db57");
  loadCss("maxdock-db58.css","87-db66","db58");
  loadCss("maxdock-db59.css","87-db66","db59");
  loadCss("maxdock-db64.css","87-db66","db64");
  loadCss("maxdock-db65.css","87-db66","db65");
  loadCss("maxdock-db66.css","87-db66","db66");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","87-db66","db33");
    await loadScript("maxdock-layout-discipline.js","87-db66","db36");
    await loadScript("maxdock-db42.js","87-db66","db42");
    await loadScript("maxdock-db43.js","87-db66","db43");
    await loadScript("maxdock-db44.js","87-db66","db44");
    await loadScript("maxdock-db45.js","87-db66","db45");
    await loadScript("maxdock-db46.js","87-db66","db46");
    await loadScript("maxdock-db47.js","87-db66","db47");
    await loadScript("maxdock-db48.js","87-db66","db48");
    await loadScript("maxdock-db49.js","87-db66","db49");
    await loadScript("maxdock-db50.js","87-db66","db50");
    await loadScript("maxdock-db51.js","87-db66","db51");
    await loadScript("maxdock-db52.js","87-db66","db52");
    await loadScript("maxdock-db53.js","87-db66","db53");
    await loadScript("maxdock-db54.js","87-db66","db54");
    await loadScript("maxdock-db55.js","87-db66","db55");
    await loadScript("maxdock-db56.js","87-db66","db56");
    await loadScript("maxdock-db64.js","87-db66","db64");
    await loadScript("maxdock-db65.js","87-db66","db65");
    await loadScript("maxdock-db66.js","87-db66","db66");
    document.documentElement.dataset.maxdockRelease="db66";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB66 · operational report reference harmonization active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();