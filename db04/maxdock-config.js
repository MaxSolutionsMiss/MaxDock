window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v54-DB33",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

(function(){
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);
  const css=document.createElement("link");
  css.rel="stylesheet";
  css.href=new URL("maxdock-db33.css?v=54-db33",base).href;
  css.dataset.maxdockRelease="db33";
  document.head.appendChild(css);

  window.addEventListener("load",()=>{
    if(document.querySelector('script[data-maxdock-release="db33"]'))return;
    const script=document.createElement("script");
    script.src=new URL("maxdock-ops-density.js?v=54-db33",base).href;
    script.dataset.maxdockRelease="db33";
    document.body.appendChild(script);
  },{once:true});
})();
