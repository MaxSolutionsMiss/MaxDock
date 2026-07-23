window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v91-DB70",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});



(function(){
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);
  document.body?.classList.add("db69Consistency","db70Consistency");
  const loadCss=(file,version,release)=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href=new URL(`${file}?v=${version}`,base).href;
    link.dataset.maxdockRelease=release;
    document.head.appendChild(link);
  };
  const loadScript=(file,version,release)=>new Promise(resolve=>{
    const existing=document.querySelector(`script[data-maxdock-release="${release}"]`)||document.querySelector(`script[src*="${file}"]`);
    if(existing){resolve();return}
    const script=document.createElement("script");
    script.src=new URL(`${file}?v=${version}`,base).href;
    script.dataset.maxdockRelease=release;
    script.async=false;
    script.addEventListener("load",resolve,{once:true});
    script.addEventListener("error",()=>{console.warn(`MaxDock ${release} asset did not load.`);resolve()},{once:true});
    document.body.appendChild(script);
  });

  loadCss("maxdock-db33.css","91-db70","db33");
  loadCss("maxdock-db34.css","91-db70","db34");
  loadCss("maxdock-db35.css","91-db70","db35");
  loadCss("maxdock-db36.css","91-db70","db36");
  loadCss("maxdock-db38.css","91-db70","db38");
  loadCss("maxdock-db39.css","91-db70","db39");
  loadCss("maxdock-db40.css","91-db70","db40");
  loadCss("maxdock-db41.css","91-db70","db41");
  loadCss("maxdock-db42.css","91-db70","db42");
  loadCss("maxdock-db43.css","91-db70","db43");
  loadCss("maxdock-db44.css","91-db70","db44");
  loadCss("maxdock-db45.css","91-db70","db45");
  loadCss("maxdock-db46.css","91-db70","db46");
  loadCss("maxdock-db47.css","91-db70","db47");
  loadCss("maxdock-db47-polish.css","91-db70","db47-polish");
  loadCss("maxdock-db48.css","91-db70","db48");
  loadCss("maxdock-db49.css","91-db70","db49");
  loadCss("maxdock-db50.css","91-db70","db50");
  loadCss("maxdock-db51.css","91-db70","db51");
  loadCss("maxdock-db52.css","91-db70","db52");
  loadCss("maxdock-db53.css","91-db70","db53");
  loadCss("maxdock-db54.css","91-db70","db54");
  loadCss("maxdock-db55.css","91-db70","db55");
  loadCss("maxdock-db56.css","91-db70","db56");
  loadCss("maxdock-db57.css","91-db70","db57");
  loadCss("maxdock-db58.css","91-db70","db58");
  loadCss("maxdock-db59.css","91-db70","db59");
  loadCss("maxdock-db64.css","91-db70","db64");
  loadCss("maxdock-db65.css","91-db70","db65");
  loadCss("maxdock-db66.css","91-db70","db66");
  loadCss("maxdock-db69.css","91-db70","db69");
  loadCss("maxdock-db70.css","91-db70","db70");
  loadCss("maxdock-db74-clean.css","106-db75","canonical-controls");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","91-db70","db33");
    await loadScript("maxdock-layout-discipline.js","91-db70","db36");
    await loadScript("maxdock-db42.js","91-db70","db42");
    await loadScript("maxdock-db43.js","91-db70","db43");
    await loadScript("maxdock-db44.js","91-db70","db44");
    await loadScript("maxdock-db45.js","91-db70","db45");
    await loadScript("maxdock-db46.js","91-db70","db46");
    await loadScript("maxdock-db47.js","91-db70","db47");
    await loadScript("maxdock-db48.js","91-db70","db48");
    await loadScript("maxdock-db49.js","91-db70","db49");
    await loadScript("maxdock-db50.js","91-db70","db50");
    await loadScript("maxdock-db51.js","91-db70","db51");
    await loadScript("maxdock-db52.js","91-db70","db52");
    await loadScript("maxdock-db53.js","91-db70","db53");
    await loadScript("maxdock-db54.js","91-db70","db54");
    await loadScript("maxdock-db55.js","91-db70","db55");
    await loadScript("maxdock-db56.js","91-db70","db56");
    await loadScript("maxdock-db64.js","91-db70","db64");
    await loadScript("maxdock-db65.js","91-db70","db65");
    await loadScript("maxdock-db66.js","91-db70","db66");
    await loadScript("maxdock-db69.js","91-db70","db69");
    await loadScript("maxdock-db70.js","91-db70","db70");
    await loadScript("maxdock-db74-clean.js","106-db75","canonical-controls");
    document.documentElement.dataset.maxdockRelease="db75";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB75 · canonical controls and booking improvements active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();