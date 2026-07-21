(function(){
  "use strict";

  const page=document.body.dataset.page||"page";

  function storageKey(root){
    return `maxdock-db42-${page}-${root.dataset.workspaceKey||"section"}`;
  }

  function activateWorkspaceSection(root,name,options={}){
    const buttons=[...root.querySelectorAll("[data-section-target]")];
    const panels=[...root.querySelectorAll("[data-section-panel]")];
    const button=buttons.find(item=>item.dataset.sectionTarget===name)||buttons[0];
    if(!button)return;
    const active=button.dataset.sectionTarget;

    buttons.forEach((item,index)=>{
      const selected=item===button;
      if(!item.id)item.id=`${page}-workspace-tab-${index+1}`;
      item.setAttribute("aria-selected",String(selected));
      item.tabIndex=selected?0:-1;
      item.classList.toggle("isActive",selected);
    });
    panels.forEach(panel=>{
      const selected=panel.dataset.sectionPanel===active;
      panel.hidden=!selected;
      panel.setAttribute("aria-hidden",String(!selected));
      const controllingButton=buttons.find(item=>item.dataset.sectionTarget===panel.dataset.sectionPanel);
      if(controllingButton)panel.setAttribute("aria-labelledby",controllingButton.id);
    });
    try{localStorage.setItem(storageKey(root),active)}catch(_error){}
    if(options.focus)button.focus();
  }

  function initWorkspace(root,index){
    root.dataset.workspaceKey=root.dataset.workspaceKey||String(index+1);
    const buttons=[...root.querySelectorAll("[data-section-target]")];
    if(!buttons.length)return;
    let initial=root.dataset.defaultSection||buttons[0].dataset.sectionTarget;
    try{initial=localStorage.getItem(storageKey(root))||initial}catch(_error){}
    activateWorkspaceSection(root,initial);

    buttons.forEach(button=>button.addEventListener("click",()=>activateWorkspaceSection(root,button.dataset.sectionTarget)));
    root.querySelector(".sectionWorkspaceTabs")?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      activateWorkspaceSection(root,buttons[next].dataset.sectionTarget,{focus:true});
    });
  }

  function initReportTabs(){
    const select=document.getElementById("reportView");
    const buttons=[...document.querySelectorAll("[data-report-view]")];
    if(!select||!buttons.length)return;

    const sync=()=>{
      buttons.forEach((button,index)=>{
        const selected=button.dataset.reportView===select.value;
        if(!button.id)button.id=`report-workspace-tab-${index+1}`;
        button.setAttribute("aria-selected",String(selected));
        button.tabIndex=selected?0:-1;
        button.classList.toggle("isActive",selected);
      });
    };
    buttons.forEach(button=>button.addEventListener("click",()=>{
      if(select.value!==button.dataset.reportView){
        select.value=button.dataset.reportView;
        select.dispatchEvent(new Event("change",{bubbles:true}));
      }
      sync();
    }));
    document.querySelector("[data-report-tabs]")?.addEventListener("keydown",event=>{
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(["ArrowDown","ArrowRight"].includes(event.key))next=(current+1)%buttons.length;
      else if(["ArrowUp","ArrowLeft"].includes(event.key))next=(current-1+buttons.length)%buttons.length;
      else if(event.key==="Home")next=0;
      else if(event.key==="End")next=buttons.length-1;
      else return;
      event.preventDefault();
      buttons[next].click();
      buttons[next].focus();
    });
    select.addEventListener("change",sync);
    sync();
    [0,250,750,1500].forEach(delay=>window.setTimeout(sync,delay));
  }

  function initialize(){
    document.body.classList.add("compactWorkspacesDB42");
    document.querySelectorAll("[data-section-workspace]").forEach(initWorkspace);
    initReportTabs();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();
