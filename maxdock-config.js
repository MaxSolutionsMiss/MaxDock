window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v78-DB57",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

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

  loadCss("maxdock-db33.css","78-db57","db33");
  loadCss("maxdock-db34.css","78-db57","db34");
  loadCss("maxdock-db35.css","78-db57","db35");
  loadCss("maxdock-db36.css","78-db57","db36");
  loadCss("maxdock-db38.css","78-db57","db38");
  loadCss("maxdock-db39.css","78-db57","db39");
  loadCss("maxdock-db40.css","78-db57","db40");
  loadCss("maxdock-db41.css","78-db57","db41");
  loadCss("maxdock-db42.css","78-db57","db42");
  loadCss("maxdock-db43.css","78-db57","db43");
  loadCss("maxdock-db44.css","78-db57","db44");
  loadCss("maxdock-db45.css","78-db57","db45");
  loadCss("maxdock-db46.css","78-db57","db46");
  loadCss("maxdock-db47.css","78-db57","db47");
  loadCss("maxdock-db47-polish.css","78-db57","db47-polish");
  loadCss("maxdock-db48.css","78-db57","db48");
  loadCss("maxdock-db49.css","78-db57","db49");
  loadCss("maxdock-db50.css","78-db57","db50");
  loadCss("maxdock-db51.css","78-db57","db51");
  loadCss("maxdock-db52.css","78-db57","db52");
  loadCss("maxdock-db53.css","78-db57","db53");
  loadCss("maxdock-db54.css","78-db57","db54");
  loadCss("maxdock-db55.css","78-db57","db55");
  loadCss("maxdock-db56.css","78-db57","db56");
  loadCss("maxdock-db57.css","78-db57","db57");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","78-db57","db33");
    await loadScript("maxdock-layout-discipline.js","78-db57","db36");
    await loadScript("maxdock-db42.js","78-db57","db42");
    await loadScript("maxdock-db43.js","78-db57","db43");
    await loadScript("maxdock-db44.js","78-db57","db44");
    await loadScript("maxdock-db45.js","78-db57","db45");
    await loadScript("maxdock-db46.js","78-db57","db46");
    await loadScript("maxdock-db47.js","78-db57","db47");
    await loadScript("maxdock-db48.js","78-db57","db48");
    await loadScript("maxdock-db49.js","78-db57","db49");
    await loadScript("maxdock-db50.js","78-db57","db50");
    await loadScript("maxdock-db51.js","78-db57","db51");
    await loadScript("maxdock-db52.js","78-db57","db52");
    await loadScript("maxdock-db53.js","78-db57","db53");
    await loadScript("maxdock-db54.js","78-db57","db54");
    await loadScript("maxdock-db55.js","78-db57","db55");
    await loadScript("maxdock-db56.js","78-db57","db56");
    await loadScript("maxdock-db57.js","78-db57","db57");
    document.documentElement.dataset.maxdockRelease="db57";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB57 · enforced compact KPI height and balanced content active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
