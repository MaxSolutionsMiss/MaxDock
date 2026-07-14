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
    const invitationError=hashParams.get("error_description")||queryParams.get("error_description");
    if(invitationError){
      showError(decodeURIComponent(invitationError.replace(/\+/g," ")));
      intro.textContent="This invitation link could not be opened.";
      return;
    }

    try{
      const session=await window.MaxDockDB.getSession();
      if(!session?.user)throw new Error("This invitation link is invalid or has expired. Ask your MaxDock administrator for a new invitation.");
      intro.textContent=`Complete the account setup for ${session.user.email}.`;
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
      if(password.length<10)return showError("Use a password with at least 10 characters.");
      if(password!==confirmation)return showError("The two passwords do not match.");

      button.disabled=true;
      button.textContent="Saving…";
      try{
        const {error}=await window.MaxDockDB.client.auth.updateUser({password});
        if(error)throw error;
        const result=await window.MaxDockDB.client.rpc("complete_password_setup");
        if(result.error)throw result.error;
        location.replace("./index.html");
      }catch(err){
        showError(err.message||"The password could not be saved.");
        button.disabled=false;
        button.textContent="Save Password";
      }
    });
  });
})();
