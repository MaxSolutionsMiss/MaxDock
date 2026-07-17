window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v57-DB36",
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
  const loadScript=(file,version,release)=>{
    if(document.querySelector(`script[data-maxdock-release="${release}"]`))return;
    const script=document.createElement("script");
    script.src=new URL(`${file}?v=${version}`,base).href;
    script.dataset.maxdockRelease=release;
    document.body.appendChild(script);
  };

  loadCss("maxdock-db33.css","54-db33","db33");
  loadCss("maxdock-db34.css","55-db34","db34");
  loadCss("maxdock-db35.css","56-db35","db35");
  loadCss("maxdock-db36.css","57-db36","db36");

  window.addEventListener("load",()=>{
    loadScript("maxdock-ops-density.js","54-db33","db33");
    loadScript("maxdock-layout-discipline.js","57-db36","db36");
  },{once:true});
})();
