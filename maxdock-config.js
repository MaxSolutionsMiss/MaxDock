window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v60-DB39",
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

  loadCss("maxdock-db33.css","60-db39","db33");
  loadCss("maxdock-db34.css","60-db39","db34");
  loadCss("maxdock-db35.css","60-db39","db35");
  loadCss("maxdock-db36.css","60-db39","db36");
  loadCss("maxdock-db38.css","60-db39","db38");
  loadCss("maxdock-db39.css","60-db39","db39");

  const initialize=async()=>{
    await loadScript("maxdock-ops-density.js","60-db39","db33");
    await loadScript("maxdock-layout-discipline.js","60-db39","db36");
    document.documentElement.dataset.maxdockRelease="db39";
    document.querySelectorAll(".menu").forEach(menu=>{
      if(menu.querySelector(".maxdockReleaseStamp"))return;
      const stamp=document.createElement("small");
      stamp.className="maxdockReleaseStamp";
      stamp.textContent="DB39 · dock policy and workflow refinement active";
      menu.appendChild(stamp);
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
