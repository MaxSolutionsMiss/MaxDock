(function(){
  "use strict";

  const db=window.MaxDockDB;
  const $=id=>document.getElementById(id);
  let initialized=false;

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]))}
  function message(error){return error?.message||String(error||"The MIS operation could not be completed.")}
  function setError(id,error=""){
    const element=$(id);if(!element)return;
    element.textContent=error?message(error):"";element.style.display=error?"block":"none";
  }
  function formatDateTime(value){return value?new Date(value).toLocaleString():"—"}

  function defaultPort(type){
    return {sql_server:1433,postgresql:5432,mysql:3306,oracle:1521}[type]||"";
  }

  function updateConnectionView(){
    const bridge=$("misSyncMode").value==="secure_bridge";
    const enabled=$("misEnabled").checked;
    const badge=$("misConnectionBadge");
    badge.textContent=bridge?(enabled?"Bridge configuration saved":"Bridge disabled"):(enabled?"CSV imports enabled":"CSV imports available");
    badge.dataset.state=enabled?"active":"inactive";
    ["misServerName","misServerPort","misDatabaseName","misCredentialSecret"].forEach(id=>$(id).required=bridge&&enabled&&["misServerName","misDatabaseName"].includes(id));
  }

  function populateSettings(settings){
    $("misDatabaseType").value=settings.database_type||"sql_server";
    $("misServerName").value=settings.server_name||"";
    $("misServerPort").value=settings.server_port||"";
    $("misDatabaseName").value=settings.database_name||"";
    $("misSourceName").value=settings.source_name||"";
    $("misSyncMode").value=settings.sync_mode||"manual_csv";
    $("misDailySyncTime").value=String(settings.daily_sync_time||"05:00").slice(0,5);
    $("misEnabled").checked=Boolean(settings.is_enabled);
    $("misCredentialSecret").value=settings.credential_secret_name||"";
    $("misLastSync").textContent=settings.last_success_at
      ?`Last successful import: ${formatDateTime(settings.last_success_at)}`
      :"No successful import recorded yet.";
    updateConnectionView();
  }

  function renderHistory(rows){
    $("misImportHistory").innerHTML=(rows||[]).length?(rows||[]).map(row=>`<tr>
      <td>${esc(formatDateTime(row.created_at))}</td>
      <td>${esc(row.file_name||"Manual import")}</td>
      <td>${Number(row.row_count||0)}</td>
      <td>${esc(row.imported_by_name||"System Admin")}</td>
    </tr>`).join(""):`<tr><td colspan="4">No inventory imports yet.</td></tr>`;
  }

  async function load(){
    const [settings,history]=await Promise.all([
      db.client.rpc("admin_get_mis_integration_settings"),
      db.client.rpc("admin_list_mis_import_runs")
    ]);
    if(settings.error)throw settings.error;
    if(history.error)throw history.error;
    populateSettings(settings.data||{});renderHistory(history.data||[]);
  }

  async function saveSettings(event){
    event.preventDefault();
    const button=$("saveMisSettings"),original=button.textContent;
    setError("misSettingsError");$("misSettingsStatus").textContent="";
    try{
      button.disabled=true;button.textContent="Saving…";
      const port=$("misServerPort").value?Number($("misServerPort").value):null;
      const result=await db.client.rpc("admin_save_mis_integration_settings",{
        p_database_type:$("misDatabaseType").value,
        p_server_name:$("misServerName").value.trim()||null,
        p_server_port:port,
        p_database_name:$("misDatabaseName").value.trim()||null,
        p_source_name:$("misSourceName").value.trim()||null,
        p_sync_mode:$("misSyncMode").value,
        p_daily_sync_time:$("misDailySyncTime").value||"05:00",
        p_is_enabled:$("misEnabled").checked,
        p_credential_secret_name:$("misCredentialSecret").value.trim()||null
      });
      if(result.error)throw result.error;
      populateSettings(result.data||{});
      $("misSettingsStatus").textContent="Integration settings saved.";
    }catch(error){setError("misSettingsError",error)}
    finally{button.disabled=false;button.textContent=original}
  }

  function parseCsv(text){
    const rows=[];let row=[],field="",quoted=false;
    const input=String(text||"").replace(/^\uFEFF/,"");
    for(let index=0;index<input.length;index++){
      const char=input[index];
      if(quoted){
        if(char==='"'&&input[index+1]==='"'){field+='"';index++}
        else if(char==='"')quoted=false;
        else field+=char;
      }else if(char==='"')quoted=true;
      else if(char===","){row.push(field);field=""}
      else if(char==="\n"){
        row.push(field);rows.push(row);row=[];field="";
      }else if(char!=="\r")field+=char;
    }
    if(field||row.length){row.push(field);rows.push(row)}
    if(quoted)throw new Error("The CSV contains an unclosed quoted value.");
    const nonempty=rows.filter(values=>values.some(value=>String(value).trim()));
    if(nonempty.length<2)throw new Error("The CSV must contain a header and at least one inventory row.");
    const headers=nonempty.shift().map(value=>String(value).trim().toLowerCase().replace(/\s+/g,"_"));
    const required=["location_code","snapshot_at","occupied_skids"];
    required.forEach(name=>{if(!headers.includes(name))throw new Error(`Missing required CSV column: ${name}`)});
    return nonempty.map((values,rowIndex)=>{
      const record={};headers.forEach((header,index)=>record[header]=String(values[index]??"").trim());
      if(!record.location_code||!record.snapshot_at||record.occupied_skids==="")throw new Error(`CSV row ${rowIndex+2} is missing a required value.`);
      if(!/^\d+$/.test(record.occupied_skids))throw new Error(`CSV row ${rowIndex+2} has an invalid occupied_skids value.`);
      for(const optional of ["total_skid_capacity","reserve_skids"]){
        if(record[optional]!==undefined&&record[optional]!==""&&!/^\d+$/.test(record[optional]))throw new Error(`CSV row ${rowIndex+2} has an invalid ${optional} value.`);
      }
      return record;
    });
  }

  async function importInventory(){
    const file=$("misInventoryFile").files?.[0],button=$("importMisInventory"),original=button.textContent;
    setError("misImportError");$("misImportResult").hidden=true;
    try{
      if(!file)throw new Error("Choose an inventory CSV file first.");
      if(file.size>5*1024*1024)throw new Error("The inventory CSV must be 5 MB or smaller.");
      button.disabled=true;button.textContent="Importing…";
      const rows=parseCsv(await file.text());
      if(rows.length>1000)throw new Error("A maximum of 1,000 inventory rows can be imported at once.");
      const result=await db.client.rpc("admin_import_inventory_snapshots",{p_rows:rows,p_file_name:file.name});
      if(result.error)throw result.error;
      $("misImportResult").textContent=`${Number(result.data?.imported_rows||rows.length)} inventory row${rows.length===1?"":"s"} imported. Capacity baselines are now updated.`;
      $("misImportResult").hidden=false;$("misInventoryFile").value="";
      await load();
    }catch(error){setError("misImportError",error)}
    finally{button.disabled=false;button.textContent=original}
  }

  function downloadTemplate(){
    const locations=db.getLocations();
    const snapshot=new Date().toISOString();
    const rows=[["location_code","snapshot_at","occupied_skids","total_skid_capacity","reserve_skids","notes"]];
    (locations.length?locations:[{code:"MISS"}]).forEach((location,index)=>rows.push([location.code,snapshot,index?"0":"1600",index?"":"2000",index?"":"50","Daily warehouse count"]));
    const csv=rows.map(row=>row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));link.download="maxdock-inventory-import-template.csv";link.click();URL.revokeObjectURL(link.href);
  }

  async function initialize(){
    if(initialized)return;initialized=true;
    if(!await db.requireAuth())return;
    await db.loadContext();
    if(db.getProfile()?.role_code!=="system_admin"){
      location.replace("./index.html?v=93-db71");
      return;
    }
    db.addAccountControls();
    $("misIntegrationForm").addEventListener("submit",saveSettings);
    $("misSyncMode").addEventListener("change",updateConnectionView);
    $("misEnabled").addEventListener("change",updateConnectionView);
    $("misDatabaseType").addEventListener("change",()=>{if(!$("misServerPort").value)$("misServerPort").value=defaultPort($("misDatabaseType").value)});
    $("importMisInventory").addEventListener("click",importInventory);
    $("downloadMisTemplate").addEventListener("click",downloadTemplate);
    await load();
  }

  window.MaxDockMIS={initialize,parseCsv};
  if(document.body?.dataset.page==="data"){
    document.addEventListener("DOMContentLoaded",()=>initialize().catch(error=>{
      setError("misSettingsError",error);
      if($("misConnectionBadge"))$("misConnectionBadge").textContent="Unable to load";
    }));
  }
})();
