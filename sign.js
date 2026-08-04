const params = new URLSearchParams(window.location.search);

const token = params.get("token");

if(!token){

    document.body.innerHTML="Missing token.";

    throw "";

}

fetch(
"https://ltatudiuhozwbufqybxd.supabase.co/functions/v1/sign-document-api?token=" + token
)

.then(r=>r.json())

.then(data=>{

document.getElementById("tenantName").innerText=
data.tenant_name;

document.getElementById("leasePDF").src=
data.pdf_url;

})

.catch(error=>{

console.log(error);

document.body.innerHTML=
"Unable to load document.";

});