window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v71-DB50",
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

  loadCss("maxdock-db33.css","71-db50","db33");
  loadCss("maxdock-db34.css","71-db50","db34");
  loadCss("maxdock-db35.css","71-db50","db35");
  loadCss("maxdock-db36.css","71-db50","db36");
  loadCss("maxdock-db38.css","71-db50","db38");
  loadCss("maxdock-db39.css","71-db50","db39");
  loadCss("maxdock-db40.css","71-db50","db40");
  loadCss("maxdock-db41.css","71-db50","db41");
  loadCss("maxdock-db42.css","71-db50","db42");
  loadCss("maxdock-db43.css","71-db50","db43");
  loadCss("maxdock-db44.css","71-db50","db44");
  loadCss("maxdock-db45.css","71-db50","db45");
  loadCss("maxdock-db46.css","71-db50","db46");
  loadCss("maxdock-db47.css","71-db50","db47");
  loadCss("maxdock-db47-polish.css","71-db50","db47-polish");
  loadCss("maxdock-db48.css","71-db50","db48");
  loadCss("maxdock-db49.css","71-db50","db49");
  loadCss("maxdock-db50.css","71-db50","db50");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","71-db50","db33");
    await loadScript("maxdock-layout-discipline.js","71-db50","db36");
    await loadScript("maxdock-db42.js","71-db50","db42");
    await loadScript("maxdock-db43.js","71-db50","db43");
    await loadScript("maxdock-db44.js","71-db50","db44");
    await loadScript("maxdock-db45.js","71-db50","db45");
    await loadScript("maxdock-db46.js","71-db50","db46");
    await loadScript("maxdock-db47.js","71-db50","db47");
    await loadScript("maxdock-db48.js","71-db50","db48");
    await loadScript("maxdock-db49.js","71-db50","db49");
    await loadScript("maxdock-db50.js","71-db50","db50");
    document.documentElement.dataset.maxdockRelease="db50";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB50 · direct vendor booking and unified interface actions active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
