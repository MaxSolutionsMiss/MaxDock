(function(){
  "use strict";

  function safeReturnTarget(){
    const requested=new URLSearchParams(location.search).get("return");
    if(!requested||!/^(index|dashboard|queue|reports|settings|admin|my-appointments)\.html(?:[?#].*)?$/.test(requested))return null;
    return requested;
  }

  function destination(){
    const requested=safeReturnTarget();
    if(!requested||window.MaxDockDB.isOperationalRole()&&/^index\.html/.test(requested))return window.MaxDockDB.getLandingPage();
    return requested;
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    const form=document.getElementById("loginForm");
    const errorBox=document.getElementById("loginError");
    const button=document.getElementById("loginButton");
    const recoveryForm=document.getElementById("recoveryForm");
    const recoveryError=document.getElementById("recoveryError");
    const recoverySuccess=document.getElementById("recoverySuccess");
    const recoveryButton=document.getElementById("recoveryButton");
    const loginHelp=document.querySelector(".loginHelp");
    const passwordInput=document.getElementById("loginPassword");
    const passwordToggle=document.getElementById("toggleLoginPassword");
    const capsLockHint=document.getElementById("capsLockHint");
    let failedAttempts=0;
    let retryTimer=null;

    passwordToggle?.addEventListener("click",()=>{
      const showing=passwordInput.type==="text";
      passwordInput.type=showing?"password":"text";
      passwordToggle.textContent=showing?"Show":"Hide";
      passwordToggle.setAttribute("aria-pressed",String(!showing));
      passwordInput.focus();
    });
    const updateCapsLock=event=>{
      const active=Boolean(event.getModifierState?.("CapsLock"));
      capsLockHint.hidden=!active;
    };
    passwordInput?.addEventListener("keydown",updateCapsLock);
    passwordInput?.addEventListener("keyup",updateCapsLock);
    passwordInput?.addEventListener("blur",()=>capsLockHint.hidden=true);

    function setRecoveryMode(active){
      form.hidden=active;
      loginHelp.hidden=active;
      document.getElementById("openRecovery").parentElement.hidden=active;
      recoveryForm.hidden=!active;
      recoveryError.textContent="";recoveryError.style.display="none";
      recoverySuccess.textContent="";recoverySuccess.hidden=true;
      if(active)setTimeout(()=>document.getElementById("recoveryEmail").focus(),0);
      else setTimeout(()=>document.getElementById("loginEmail").focus(),0);
    }

    try{
      if(await window.MaxDockDB.getSession()){
        await window.MaxDockDB.loadContext();
        location.replace(`./${destination()}`);
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
        location.replace(`./${destination()}`);
      }catch(err){
        failedAttempts+=1;
        const throttled=failedAttempts>=5;
        errorBox.textContent=throttled
          ?"Several sign-in attempts failed. Wait 30 seconds before trying again, or use account recovery."
          :failedAttempts>=3
          ?`${err.message} Check Caps Lock or use account recovery if needed.`
          :err.message;
        errorBox.style.display="block";
        if(throttled){
          button.disabled=true;button.textContent="Try Again in 30s";
          window.clearTimeout(retryTimer);
          retryTimer=window.setTimeout(()=>{failedAttempts=0;button.disabled=false;button.textContent="Sign In"},30000);
        }else{
          button.disabled=false;
          button.textContent="Sign In";
        }
      }
    });

    document.getElementById("openRecovery").addEventListener("click",()=>setRecoveryMode(true));
    document.getElementById("closeRecovery").addEventListener("click",()=>setRecoveryMode(false));
    recoveryForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const email=document.getElementById("recoveryEmail").value.trim().toLowerCase();
      recoveryError.textContent="";recoveryError.style.display="none";
      recoverySuccess.hidden=true;
      recoveryButton.disabled=true;recoveryButton.textContent="Sending…";
      try{
        const redirectTo=new URL("./set-password.html?recovery=1",location.href).href;
        const {error}=await window.MaxDockDB.client.auth.resetPasswordForEmail(email,{redirectTo});
        if(error)throw error;
        recoverySuccess.textContent="If this email is connected to MaxDock, a secure reset link is on its way. Check your inbox and junk folder.";
        recoverySuccess.hidden=false;
        recoveryButton.textContent="Send Again";
      }catch(err){
        recoveryError.textContent=err.message||"The reset link could not be sent. Please try again shortly.";
        recoveryError.style.display="block";
        recoveryButton.textContent="Send Reset Link";
      }finally{recoveryButton.disabled=false}
    });
  });
})();
