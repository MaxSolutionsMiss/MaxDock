window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v55-DB34",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

(function(){
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);

  const densityCss=document.createElement("link");
  densityCss.rel="stylesheet";
  densityCss.href=new URL("maxdock-db33.css?v=54-db33",base).href;
  densityCss.dataset.maxdockRelease="db33";
  document.head.appendChild(densityCss);

  const disciplineCss=document.createElement("link");
  disciplineCss.rel="stylesheet";
  disciplineCss.href=new URL("maxdock-db34.css?v=55-db34",base).href;
  disciplineCss.dataset.maxdockRelease="db34";
  document.head.appendChild(disciplineCss);

  window.addEventListener("load",()=>{
    if(document.querySelector('script[data-maxdock-release="db33"]'))return;
    const script=document.createElement("script");
    script.src=new URL("maxdock-ops-density.js?v=54-db33",base).href;
    script.dataset.maxdockRelease="db33";
    document.body.appendChild(script);
  },{once:true});
})();
