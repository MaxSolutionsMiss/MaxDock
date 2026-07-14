(function(){
  "use strict";

  function safeReturnTarget(){
    const requested=new URLSearchParams(location.search).get("return")||"index.html";
    if(!/^(index|dashboard|settings|admin)\.html(?:[?#].*)?$/.test(requested))return "index.html";
    return requested;
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    const form=document.getElementById("loginForm");
    const errorBox=document.getElementById("loginError");
    const button=document.getElementById("loginButton");

    try{
      if(await window.MaxDockDB.getSession()){
        location.replace(`./${safeReturnTarget()}`);
        return;
      }
    }catch(err){
      errorBox.textContent=err.message;
      errorBox.style.display="block";
    }

    form.addEventListener("submit",async event=>{
      event.preventDefault();
      errorBox.textContent="";
      errorBox.style.display="none";
      button.disabled=true;
      button.textContent="Signing In…";
      try{
        await window.MaxDockDB.signIn(
          document.getElementById("loginEmail").value,
          document.getElementById("loginPassword").value
        );
        await window.MaxDockDB.loadContext();
        location.replace(`./${safeReturnTarget()}`);
      }catch(err){
        errorBox.textContent=err.message;
        errorBox.style.display="block";
        button.disabled=false;
        button.textContent="Sign In";
      }
    });
  });
})();
