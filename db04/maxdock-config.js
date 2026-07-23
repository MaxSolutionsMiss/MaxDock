window.MAXDOCK_CONFIG = Object.freeze({
  version: "MaxDock-v92-DB71",
  supabaseUrl: "https://rywzqepzramurbrpmept.supabase.co",
  supabasePublishableKey: "sb_publishable_xZL-zqQP2qaQKGVBL1TGdA_62I9r1PA"
});

window.MAXDOCK_ICONS = Object.freeze({
  menu:'<svg data-icon="solid" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8 8 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/></svg>',
  calendar:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg>',
  refresh:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8.3A7 7 0 0 1 18.7 7M17.9 15.7A7 7 0 0 1 5.3 17"/></svg>',
  export:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 18v3h14v-3"/></svg>',
  print:'<svg data-icon="line" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>'
});

(function(){
  "use strict";
  let previousFocus=null;
  let activeModal=null;

  const focusableSelector=[
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  const visibleFocusable=root=>[...root.querySelectorAll(focusableSelector)]
    .filter(element=>!element.hidden&&element.getAttribute("aria-hidden")!=="true"&&element.getClientRects().length);

  function toast(message,{tone="success",duration=4200}={}){
    let region=document.getElementById("maxdockToastRegion");
    if(!region){
      region=document.createElement("div");
      region.id="maxdockToastRegion";
      region.className="maxdockToastRegion";
      region.setAttribute("aria-live","polite");
      region.setAttribute("aria-atomic","true");
      document.body.appendChild(region);
    }
    const item=document.createElement("div");
    item.className=`maxdockToast ${tone}`;
    item.setAttribute("role",tone==="error"?"alert":"status");
    item.textContent=String(message||"");
    region.appendChild(item);
    requestAnimationFrame(()=>item.classList.add("show"));
    window.setTimeout(()=>{
      item.classList.remove("show");
      window.setTimeout(()=>item.remove(),180);
    },duration);
  }

  function confirmAction({
    title="Please confirm",
    message="Continue with this action?",
    confirmLabel="Continue",
    cancelLabel="Cancel",
    tone="danger",
    verificationLabel="",
    verificationValue="",
    verificationHelp=""
  }={}){
    return new Promise(resolve=>{
      const overlay=document.createElement("div");
      const titleId=`maxdockConfirmTitle-${Date.now()}`;
      overlay.className="modalOverlay maxdockConfirmOverlay";
      overlay.setAttribute("role","dialog");
      overlay.setAttribute("aria-modal","true");
      overlay.setAttribute("aria-labelledby",titleId);
      const card=document.createElement("div");
      card.className="modalCard maxdockConfirmCard";
      const heading=document.createElement("h3");
      heading.id=titleId;
      heading.textContent=title;
      const body=document.createElement("p");
      body.textContent=message;
      let verificationInput=null;
      if(verificationValue){
        const field=document.createElement("label");
        field.className="maxdockConfirmVerification";
        const fieldLabel=document.createElement("span");
        fieldLabel.textContent=verificationLabel||`Type ${verificationValue} to continue`;
        verificationInput=document.createElement("input");
        verificationInput.type="text";
        verificationInput.autocomplete="off";
        verificationInput.spellcheck=false;
        if(verificationHelp)verificationInput.setAttribute("aria-describedby",`${titleId}-verification-help`);
        field.append(fieldLabel,verificationInput);
        card.append(heading,body,field);
        if(verificationHelp){
          const help=document.createElement("small");
          help.id=`${titleId}-verification-help`;
          help.className="maxdockConfirmVerificationHelp";
          help.textContent=verificationHelp;
          card.appendChild(help);
        }
      }else{
        card.append(heading,body);
      }
      const actions=document.createElement("div");
      actions.className="modalActions";
      const cancel=document.createElement("button");
      cancel.type="button";
      cancel.className="secondaryBtn";
      cancel.textContent=cancelLabel;
      const confirm=document.createElement("button");
      confirm.type="button";
      confirm.className=tone==="danger"?"dangerBtn":"primaryBtn";
      confirm.textContent=confirmLabel;
      if(verificationInput)confirm.disabled=true;
      actions.append(cancel,confirm);
      card.append(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      let settled=false;
      const finish=value=>{
        if(settled)return;
        settled=true;
        overlay.classList.remove("show");
        window.setTimeout(()=>{overlay.remove();syncActiveModal()},180);
        resolve(value);
      };
      cancel.addEventListener("click",()=>finish(false));
      confirm.addEventListener("click",()=>finish(true));
      verificationInput?.addEventListener("input",()=>{
        confirm.disabled=verificationInput.value.trim().toLowerCase()!==String(verificationValue).trim().toLowerCase();
      });
      overlay.addEventListener("click",event=>{if(event.target===overlay)finish(false)});
      overlay.addEventListener("keydown",event=>{
        if(event.key==="Escape"){event.preventDefault();finish(false)}
      });
      requestAnimationFrame(()=>{
        overlay.classList.add("show");
        syncActiveModal();
        (verificationInput||cancel).focus();
      });
    });
  }

  function syncActiveModal(){
    const next=[...document.querySelectorAll(".modalOverlay.show")].filter(element=>!element.hidden).at(-1)||null;
    if(next===activeModal)return;
    if(next){
      if(!activeModal)previousFocus=document.activeElement;
      activeModal=next;
      if(!activeModal.hasAttribute("role"))activeModal.setAttribute("role","dialog");
      activeModal.setAttribute("aria-modal","true");
      const focusable=visibleFocusable(activeModal);
      if(!activeModal.contains(document.activeElement))(focusable[0]||activeModal).focus?.();
    }else{
      activeModal=null;
      if(previousFocus?.isConnected)previousFocus.focus?.();
      previousFocus=null;
    }
  }

  function initTabs(container){
    const tabs=[...container.querySelectorAll('[role="tab"]')];
    if(!tabs.length)return;
    const sectionTabs=tabs.some(tab=>tab.dataset.sectionTarget);
    const select=(tab,{focus=false,activate=true}={})=>{
      tabs.forEach(item=>{
        const selected=item===tab;
        item.setAttribute("aria-selected",String(selected));
        item.tabIndex=selected?0:-1;
        if(sectionTabs&&activate){
          const target=item.dataset.sectionTarget;
          document.querySelectorAll(`[data-section-panel]`).forEach(panel=>{
            if(panel.closest("[data-section-workspace]")===container.closest("[data-section-workspace]")){
              panel.hidden=panel.dataset.sectionPanel!==target;
              panel.tabIndex=panel.hidden?-1:0;
            }
          });
        }
      });
      if(focus)tab.focus();
    };
    const selected=tabs.find(tab=>tab.getAttribute("aria-selected")==="true")
      ||tabs.find(tab=>{
        const target=tab.dataset.sectionTarget;
        return target&&container.closest("[data-section-workspace]")?.querySelector(`[data-section-panel="${target}"]:not([hidden])`);
      })
      ||tabs[0];
    select(selected,{activate:sectionTabs});
    tabs.forEach((tab,index)=>{
      tab.addEventListener("click",()=>select(tab,{activate:sectionTabs}));
      tab.addEventListener("keydown",event=>{
        const keys=["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"];
        if(!keys.includes(event.key))return;
        event.preventDefault();
        const offset=["ArrowLeft","ArrowUp"].includes(event.key)?-1:1;
        const nextIndex=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+offset+tabs.length)%tabs.length;
        tabs[nextIndex].click();
        select(tabs[nextIndex],{focus:true,activate:sectionTabs});
      });
    });
  }

  function setupAccessibility(){
    document.querySelectorAll("[role='tablist'],.sectionWorkspaceTabs").forEach(initTabs);
    document.querySelectorAll("details").forEach(details=>{
      const summary=details.querySelector(":scope > summary");
      if(!summary)return;
      const sync=()=>summary.setAttribute("aria-expanded",String(details.open));
      sync();
      details.addEventListener("toggle",sync);
    });
    document.addEventListener("keydown",event=>{
      if(event.key!=="Tab"||!activeModal)return;
      const focusable=visibleFocusable(activeModal);
      if(!focusable.length){event.preventDefault();activeModal.focus?.();return}
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
    if(window.MaxDockSharedMutationObserver){
      const observer=new window.MaxDockSharedMutationObserver(syncActiveModal);
      document.querySelectorAll(".modalOverlay").forEach(modal=>observer.observe(modal,{attributes:true,attributeFilter:["class","hidden"]}));
    }
    syncActiveModal();
  }

  window.MaxDockUI=Object.freeze({toast,confirmAction,initTabs,setupAccessibility});
})();

(function(){
  const current=document.currentScript;
  const base=current?.src?new URL(".",current.src):new URL(".",location.href);
  document.body?.classList.add("db69Consistency","db70Consistency");
  const hydrateIcons=(root=document)=>{
    root.querySelectorAll("[data-maxdock-icon]").forEach(slot=>{
      const icon=window.MAXDOCK_ICONS[slot.dataset.maxdockIcon];
      if(icon&&slot.innerHTML!==icon)slot.innerHTML=icon;
    });
  };
  window.MAXDOCK_HYDRATE_ICONS=hydrateIcons;
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

  const initialize=async()=>{
    hydrateIcons();
    await loadScript("maxdock-layout-discipline.js","93-db71","db71-layout");
    hydrateIcons();
    window.MaxDockUI?.setupAccessibility?.();
    document.documentElement.dataset.maxdockRelease="db71";
    document.querySelectorAll(".menu").forEach(menu=>{
      let stamp=menu.querySelector(".maxdockReleaseStamp");
      if(!stamp){
        stamp=document.createElement("small");
        stamp.className="maxdockReleaseStamp";
        menu.appendChild(stamp);
      }
      stamp.textContent="DB71 · live-readiness hotfix";
    });
  };
  if(document.readyState==="complete")initialize();
  else window.addEventListener("load",initialize,{once:true});
})();
