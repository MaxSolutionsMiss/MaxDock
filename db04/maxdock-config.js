window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v56-DB35",
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

  loadCss("maxdock-db33.css","54-db33","db33");
  loadCss("maxdock-db34.css","55-db34","db34");
  loadCss("maxdock-db35.css","56-db35","db35");

  window.addEventListener("load",()=>{
    if(document.querySelector('script[data-maxdock-release="db33"]'))return;
    const script=document.createElement("script");
    script.src=new URL("maxdock-ops-density.js?v=54-db33",base).href;
    script.dataset.maxdockRelease="db33";
    document.body.appendChild(script);
  },{once:true});
})();
