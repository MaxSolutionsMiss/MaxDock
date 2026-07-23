(function(){
  "use strict";

  document.addEventListener("DOMContentLoaded",async()=>{
    const form=document.getElementById("passwordForm");
    const intro=document.getElementById("passwordIntro");
    const errorBox=document.getElementById("passwordError");
    const button=document.getElementById("passwordButton");

    function showError(message){
      errorBox.textContent=message;
      errorBox.style.display="block";
    }

    const hashParams=new URLSearchParams(location.hash.replace(/^#/,""));
    const queryParams=new URLSearchParams(location.search);
    const recoveryMode=queryParams.get("recovery")==="1"||hashParams.get("type")==="recovery";
    document.getElementById("passwordTitle").textContent=recoveryMode?"Reset your password":"Set your password";
    const invitationError=hashParams.get("error_description")||queryParams.get("error_description");
    if(invitationError){
      showError(decodeURIComponent(invitationError.replace(/\+/g," ")));
      intro.textContent=recoveryMode?"This password-reset link could not be opened.":"This invitation link could not be opened.";
      return;
    }

    try{
      const session=await window.MaxDockDB.getSession();
      if(!session?.user)throw new Error(recoveryMode
        ? "This password-reset session is invalid or has expired. Return to sign in and request a new reset link."
        : "This setup session is invalid or has expired. Ask your MaxDock administrator for a new setup link, or sign in again with your temporary password.");
      const profileResult=await window.MaxDockDB.client.from("profiles").select("username,full_name").eq("id",session.user.id).maybeSingle();
      const profile=profileResult.data;
      intro.textContent=profile
        ? `${recoveryMode?"Reset":"Choose"} a private password for ${profile.full_name||profile.username} (${profile.username}).`
        : recoveryMode?"Choose a new private password for your MaxDock account.":"Choose a private password to complete your MaxDock account setup.";
      form.hidden=false;
    }catch(err){
      showError(err.message);
      return;
    }

    form.addEventListener("submit",async event=>{
      event.preventDefault();
      errorBox.style.display="none";
      errorBox.textContent="";
      const password=document.getElementById("newPassword").value;
      const confirmation=document.getElementById("confirmPassword").value;
      if(password.length<12)return showError("Use a password with at least 12 characters.");
      if(password!==confirmation)return showError("The two passwords do not match.");

      button.disabled=true;
      button.textContent="Saving…";
      try{
        const {error}=await window.MaxDockDB.client.auth.updateUser({password});
        if(error)throw error;
        const result=await window.MaxDockDB.client.rpc("complete_password_setup");
        if(result.error)throw result.error;
        await window.MaxDockDB.loadContext();
        location.replace(`./${window.MaxDockDB.getLandingPage()}`);
      }catch(err){
        showError(err.message||"The password could not be saved.");
        button.disabled=false;
        button.textContent="Save Password";
      }
    });
  });
})();
