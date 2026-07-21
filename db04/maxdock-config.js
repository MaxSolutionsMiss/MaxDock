window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v65-DB44",
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

  loadCss("maxdock-db33.css","65-db44","db33");
  loadCss("maxdock-db34.css","65-db44","db34");
  loadCss("maxdock-db35.css","65-db44","db35");
  loadCss("maxdock-db36.css","65-db44","db36");
  loadCss("maxdock-db38.css","65-db44","db38");
  loadCss("maxdock-db39.css","65-db44","db39");
  loadCss("maxdock-db40.css","65-db44","db40");
  loadCss("maxdock-db41.css","65-db44","db41");
  loadCss("maxdock-db42.css","65-db44","db42");
  loadCss("maxdock-db43.css","65-db44","db43");
  loadCss("maxdock-db44.css","65-db44","db44");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","65-db44","db33");
    await loadScript("maxdock-layout-discipline.js","65-db44","db36");
    await loadScript("maxdock-db42.js","65-db44","db42");
    await loadScript("maxdock-db43.js","65-db44","db43");
    await loadScript("maxdock-db44.js","65-db44","db44");
    document.documentElement.dataset.maxdockRelease="db44";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB44 · coloured identity and stable navigation active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
