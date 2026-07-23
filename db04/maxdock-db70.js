(function(){
  "use strict";

  const PAGE=document.body.dataset.page||"";
  const $=id=>document.getElementById(id);
  const EXPORT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 18v3h14v-3"/></svg>';
  const PRINT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>';
  let queued=false;

  function orderChildren(parent,ordered){
    if(!parent)return;
    ordered.filter(Boolean).forEach((element,index)=>{
      if(element.parentElement!==parent||parent.children[index]!==element){
        parent.insertBefore(element,parent.children[index]||null);
      }
    });
  }

  function legacyDocumentButtons(){
    return [...new Set([
      ...document.querySelectorAll(".dashboardUtilityActions > button"),
      ...document.querySelectorAll(".pageUtilityActions > button"),
      $("exportQueue"),$("printQueue"),$("exportReport")
    ].filter(Boolean))].filter(button=>!button.closest("#maxdockDocumentTools"));
  }

  function markLegacyDocumentButtons(){
    legacyDocumentButtons().forEach(button=>{
      button.classList.add("db70LegacyDocumentAction");
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });
    document.querySelectorAll(".pageUtilityActions").forEach(group=>group.classList.add("db70LegacyDocumentGroup"));
  }

  function csvCell(value){
    return `"${String(value??"").replace(/"/g,'""').replace(/\s+/g," ").trim()}"`;
  }

  function downloadCsv(rows){
    const content=rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
    const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    const locationName=window.MaxDockDB?.getCurrentLocation?.()?.name||"all-locations";
    const slug=value=>String(value||"maxdock").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    link.href=url;
    link.download=`maxdock-${slug(PAGE)}-${slug(locationName)}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function genericPageExport(){
    const rows=[];
    const tables=[...document.querySelectorAll("main table")].filter(table=>{
      const style=getComputedStyle(table);
      return !table.hidden&&style.display!=="none"&&style.visibility!=="hidden";
    });
    tables.forEach((table,index)=>{
      if(index)rows.push([]);
      const heading=table.closest("section,.panel")?.querySelector("h2,h3")?.textContent?.trim();
      if(heading)rows.push([heading]);
      table.querySelectorAll("tr").forEach(row=>{
        const cells=[...row.querySelectorAll("th,td")].map(cell=>cell.innerText.trim());
        if(cells.length)rows.push(cells);
      });
    });
    if(!rows.length){
      rows.push(["Field","Value"]);
      document.querySelectorAll("main label[for]").forEach(label=>{
        const control=$(label.htmlFor);
        if(!control||control.disabled||control.type==="password")return;
        const value=control.tagName==="SELECT"?control.selectedOptions[0]?.textContent:control.value;
        rows.push([label.textContent.trim(),value||""]);
      });
    }
    if(rows.length<2){
      rows.push(
        ["Page",document.querySelector(".pageHead h2,main h2")?.textContent||PAGE||"MaxDock"],
        ["Location",window.MaxDockDB?.getCurrentLocation?.()?.name||""],
        ["Exported",new Date().toLocaleString()]
      );
    }
    downloadCsv(rows);
  }

  function performExport(){
    if(PAGE==="dashboard"&&typeof window.exportCSV==="function"){
      window.exportCSV();
      return;
    }
    if(PAGE==="queue"&&typeof window.maxdockExportQueue==="function"){
      window.maxdockExportQueue();
      return;
    }
    if(PAGE==="reports"&&typeof window.maxdockExportReport==="function"){
      window.maxdockExportReport();
      return;
    }
    const legacy=PAGE==="queue"?$("exportQueue"):PAGE==="reports"?$("exportReport"):null;
    if(legacy){
      legacy.click();
      return;
    }
    genericPageExport();
  }

  function alignDocumentTools(){
    const tools=$("maxdockDocumentTools");
    const signOut=document.querySelector("#maxdockAccount .accountSignOut");
    if(!tools||!signOut)return;
    const rect=signOut.getBoundingClientRect();
    tools.style.setProperty("--db70-document-tools-width",`${Math.max(88,Math.round(rect.width))}px`);
    tools.style.setProperty("--db70-document-tools-right",`${Math.max(14,Math.round(window.innerWidth-rect.right))}px`);
  }

  function ensureDocumentTools(){
    if(["login","setpassword"].includes(PAGE))return;
    const header=document.querySelector(".topbar");
    const signOut=document.querySelector("#maxdockAccount .accountSignOut");
    if(!header||!signOut)return;
    let row=$("maxdockDocumentUtilityRow");
    if(!row){
      row=document.createElement("div");
      row.id="maxdockDocumentUtilityRow";
      row.className="maxdockDocumentUtilityRow";
      row.setAttribute("aria-label","Page document actions");
      const tools=document.createElement("div");
      tools.id="maxdockDocumentTools";
      tools.className="maxdockDocumentTools";
      const exportButton=document.createElement("button");
      exportButton.id="maxdockGlobalExport";
      exportButton.type="button";
      exportButton.className="maxdockDocumentIcon";
      exportButton.title="Export this page to CSV";
      exportButton.setAttribute("aria-label","Export this page to CSV");
      exportButton.innerHTML=EXPORT_ICON;
      exportButton.addEventListener("click",performExport);
      const printButton=document.createElement("button");
      printButton.id="maxdockGlobalPrint";
      printButton.type="button";
      printButton.className="maxdockDocumentIcon";
      printButton.title="Print this page";
      printButton.setAttribute("aria-label","Print this page");
      printButton.innerHTML=PRINT_ICON;
      printButton.addEventListener("click",()=>window.print());
      tools.append(exportButton,printButton);
      row.appendChild(tools);
      header.insertAdjacentElement("afterend",row);
    }
    alignDocumentTools();
  }

  function rightHost(toolbar,className,label){
    let host=toolbar?.querySelector(`:scope > .${className}`);
    if(!host&&toolbar){
      host=document.createElement("div");
      host.className=`db70RightActions ${className}`;
      host.setAttribute("role","group");
      host.setAttribute("aria-label",label);
      toolbar.appendChild(host);
    }
    return host;
  }

  function normalizeDashboard(){
    if(PAGE!=="dashboard")return;
    const toolbar=document.querySelector(".dashboardFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const date=$("adminDate")?.closest(".db69FieldPair,.filterField");
    const status=$("adminStatus")?.closest(".db69FieldPair,.filterField");
    const primary=document.querySelector(".dashboardPrimaryActions");
    const range=$("dashboardRange")?.closest(".db69FieldPair,.rangeMetric,.dashboardRangeHost");
    const gear=document.querySelector("#dashboardCustomize,.dashboardCustomize");
    if(primary)primary.classList.add("db70PrimaryActions");
    if(gear){
      gear.classList.add("db70ToolbarGear");
      toolbar.appendChild(gear);
    }
    orderChildren(toolbar,[date,status,primary,range,gear]);
  }

  function normalizeQueue(){
    if(PAGE!=="queue")return;
    const toolbar=document.querySelector(".queueFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const date=$("queueDate")?.closest(".db69FieldPair,.filterField");
    const status=$("queueStatus")?.closest(".db69FieldPair,.filterField");
    const quick=document.querySelector(".queueFilterActions");
    const right=toolbar.querySelector(":scope > .db69QueueRightActions")||rightHost(toolbar,"db70QueueRightActions","Queue display actions");
    const display=$("openQueueDisplay");
    const gear=$("queueCustomize");
    if(right){
      if(display)right.appendChild(display);
      if(gear){gear.classList.add("db70ToolbarGear");right.appendChild(gear)}
    }
    orderChildren(toolbar,[date,status,quick,right]);
  }

  function normalizeReports(){
    if(PAGE!=="reports")return;
    const toolbar=document.querySelector(".reportFilters");
    if(!toolbar)return;
    toolbar.classList.add("db70ControlBar");
    const view=$("reportView")?.closest(".db69FieldPair,.filterField");
    const preset=$("reportPreset")?.closest(".db69FieldPair,.filterField");
    const custom=$("reportCustomDates");
    const update=$("runReport");
    const right=toolbar.querySelector(":scope > .db69ReportRightActions")||rightHost(toolbar,"db70ReportRightActions","Report display options");
    const gear=$("db64ReportCustomize");
    if(right&&gear){gear.classList.add("db70ToolbarGear");right.appendChild(gear)}
    orderChildren(toolbar,[view,preset,custom,update,right]);
  }

  function enforceLocationContract(){
    const db=window.MaxDockDB;
    const role=db?.getProfile?.()?.role_code;
    if(!role)return;
    const operational=db.isOperationalRole?.(role)||false;
    const systemAdmin=role==="system_admin";
    document.body.classList.toggle("operationalLocation",operational);
    document.body.classList.toggle("systemAdminLocation",systemAdmin);
    document.body.classList.toggle("fixedOperationalLocation",operational&&!systemAdmin);
    document.querySelectorAll(".headerActions .locationPill").forEach(pill=>{
      pill.hidden=!operational;
      pill.style.setProperty("display",operational?"flex":"none","important");
      const select=pill.querySelector("select");
      if(!select)return;
      select.disabled=!systemAdmin;
      select.setAttribute("aria-disabled",String(!systemAdmin));
      select.title=systemAdmin?"Choose the active MaxDock location":`Assigned location: ${select.value}`;
    });
  }

  function protectReportMetrics(){
    if(PAGE!=="reports")return;
    const metrics=$("reportMetrics");
    if(!metrics||metrics.hidden||metrics.classList.contains("metricsDashboardHidden"))return;
    const cards=[...metrics.children].filter(card=>!card.hidden&&getComputedStyle(card).display!=="none");
    const compact=window.innerWidth<1500;
    metrics.style.setProperty("grid-template-columns",compact?"repeat(auto-fit,minmax(170px,1fr))":`repeat(${Math.max(1,cards.length)},minmax(0,1fr))`,"important");
    metrics.style.setProperty("height","auto","important");
    metrics.style.setProperty("min-height","82px","important");
    metrics.style.setProperty("max-height","none","important");
    cards.forEach(card=>{
      card.style.setProperty("height","82px","important");
      card.style.setProperty("min-height","82px","important");
      card.style.setProperty("max-height","82px","important");
    });
  }

  function apply(){
    document.body.classList.add("db70Consistency");
    markLegacyDocumentButtons();
    normalizeDashboard();
    normalizeQueue();
    normalizeReports();
    enforceLocationContract();
    ensureDocumentTools();
    protectReportMetrics();
  }

  function queueApply(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      apply();
    });
  }

  function init(){
    apply();
    [80,220,500,1000,1900,3000].forEach(delay=>setTimeout(apply,delay));
    new MutationObserver(queueApply).observe(document.body,{childList:true,subtree:true});
    window.addEventListener("resize",queueApply,{passive:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
