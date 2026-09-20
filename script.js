const db = supabase.createClient(
"https://vxfkxkvndmuupfilxqzx.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zmt4a3ZuZG11dXBmaWx4cXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ4NDIsImV4cCI6MjEwNTQ4MDg0Mn0.zlpBvjPwjUOHRvClzb9nRDQQhd3wSfdL8M0IC-k0FF4"
);

var auth=document.getElementById("auth");
var app=document.getElementById("app");
var nameI=document.getElementById("authName");
var passI=document.getElementById("authPass");
var passI2=document.getElementById("authPass2");
var loginB=document.getElementById("loginBtn");
var regB=document.getElementById("regBtn");
var errB=document.getElementById("authError");
var outB=document.getElementById("logoutBtn");
var profB=document.getElementById("profileBtn");
var backB=document.getElementById("backBtn");
var myN=document.getElementById("myName");
var myU=document.getElementById("myUser");
var myA=document.getElementById("myAvatar");
var mainH=document.getElementById("mainHeader");
var chatH=document.getElementById("chatHeader");
var chatA=document.getElementById("chatAvatar");
var chatN=document.getElementById("chatName");
var chatU=document.getElementById("chatUser");
var tabsEl=document.getElementById("tabs");
var pageG=document.getElementById("page-general");
var pageS=document.getElementById("page-search");
var pageP=document.getElementById("page-private");
var pagePr=document.getElementById("page-profile");
var msgs=document.getElementById("messages");
var fm=document.getElementById("chatForm");
var inp=document.getElementById("messageInput");
var privMsgs=document.getElementById("privateMessages");
var privFm=document.getElementById("privateForm");
var privInp=document.getElementById("privateInput");
var searchI=document.getElementById("searchInput");
var searchR=document.getElementById("searchResults");
var profUser=document.getElementById("profUsername");
var profDisp=document.getElementById("profDisplay");
var profBio=document.getElementById("profBio");
var saveP=document.getElementById("saveProfile");
var profMsg=document.getElementById("profMsg");

var me=null;
var myProfile=null;
var currentChat=null;
var roomChannel=null;

function toMail(n){
return n.toLowerCase().trim().replace(/[^a-z0-9а-яё_]/gi,"")+"@sotagram.local";
}

function err(t){errB.textContent=t||"";}

function showAuth(){
auth.style.display="flex";
app.style.display="none";
me=null;myProfile=null;currentChat=null;
}

function showApp(){
auth.style.display="none";
app.style.display="flex";
}

async function loginSuccess(user){
me=user;
var p=await db.from("profiles").select("*").eq("id",user.id).single();

if(p.error||!p.data){
  var nick=user.email.split("@")[0];
  var ins=await db.from("profiles").insert({id:user.id,username:nick,display_name:nick});
  if(!ins.error){
    p=await db.from("profiles").select("*").eq("id",user.id).single();
  }
}

myProfile=p.data||{username:user.email.split("@")[0],display_name:user.email.split("@")[0]};
myN.textContent=myProfile.display_name||myProfile.username;
myU.textContent="@"+myProfile.username;
myA.textContent=(myProfile.username||"?").charAt(0).toUpperCase();

showApp();
switchTab("general");
loadGeneral();
subscribeGeneral();
}

loginB.onclick=async function(){
err("");
var n=nameI.value.trim();
var p=passI.value;
if(!n||!p)return err("заполни всё");

var r=await db.auth.signInWithPassword({email:toMail(n),password:p});
if(r.error)return err("неверный ник или пароль");
loginSuccess(r.data.user);
};

regB.onclick=async function(){
err("");
var n=nameI.value.trim();
var p=passI.value;
var p2=passI2.value;

if(!n||!p)return err("заполни всё");
if(n.length<2)return err("ник короткий");
if(p.length<4)return err("пароль от 4 символов");
if(p!==p2)return err("пароли не совпадают");

var r=await db.auth.signUp({email:toMail(n),password:p});
if(r.error)return err(r.error.message);
if(!r.data.user)return err("проверь настройки supabase");

await db.from("profiles").insert({
  id:r.data.user.id,
  username:n.toLowerCase(),
  display_name:n
});

loginSuccess(r.data.user);
};

outB.onclick=async function(){
if(roomChannel){db.removeChannel(roomChannel);roomChannel=null;}
await db.auth.signOut();
showAuth();
};

profB.onclick=function(){switchTab("profile");};

backB.onclick=function(){
if(roomChannel){db.removeChannel(roomChannel);roomChannel=null;}
currentChat=null;
switchTab("search");
};

function switchTab(t){
var tabs=tabsEl.querySelectorAll(".tab");
for(var i=0;i<tabs.length;i++)tabs[i].classList.remove("active");

pageG.style.display="none";
pageS.style.display="none";
pageP.style.display="none";
pagePr.style.display="none";
mainH.style.display="flex";
chatH.style.display="none";
tabsEl.style.display="flex";

if(t==="general"){
  pageG.style.display="flex";
  tabs[0].classList.add("active");
}else if(t==="search"){
  pageS.style.display="block";
  tabs[1].classList.add("active");
  searchI.focus();
}else if(t==="profile"){
  pagePr.style.display="block";
  loadProfileForm();
}else if(t==="private"){
  pageP.style.display="flex";
  mainH.style.display="none";
  chatH.style.display="flex";
  tabsEl.style.display="none";
}
}

function nowTime(iso){
var t=new Date(iso);
var h=t.getHours();
var m=t.getMinutes();
if(m<10)m="0"+m;
return h+":"+m;
}

function buildMsg(row,mine,showName){
var d=document.createElement("div");
d.className=mine?"message outgoing":"message incoming";

if(!mine&&showName){
  var n=document.createElement("strong");
  n.textContent=row.username;
  d.appendChild(n);
}

var p=document.createElement("p");
p.textContent=row.content;
d.appendChild(p);

var s=document.createElement("span");
s.className="time";
s.textContent=nowTime(row.created_at);
d.appendChild(s);

return d;
}

function down(el){el.scrollTop=el.scrollHeight;}

async function loadGeneral(){
var r=await db.from("messages").select("*").eq("room","general").order("id",{ascending:true}).limit(200);
if(r.error){console.log(r.error);return;}
msgs.innerHTML="";
for(var i=0;i<r.data.length;i++){
  var row=r.data[i];
  var mine=me&&row.user_id===me.id;
  msgs.appendChild(buildMsg(row,mine,true));
}
down(msgs);
}

function subscribeGeneral(){
db.channel("gen")
.on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"room=eq.general"},function(p){
  var row=p.new;
  if(row.room!=="general")return;
  var mine=me&&row.user_id===me.id;
  msgs.appendChild(buildMsg(row,mine,true));
  down(msgs);
})
.subscribe();
}

fm.onsubmit=async function(e){
e.preventDefault();
var v=inp.value.trim();
if(!v||!me)return;
inp.value="";
inp.focus();

var r=await db.from("messages").insert({
  username:myProfile.username,
  content:v,
  user_id:me.id,
  room:"general"
});
if(r.error){console.log(r.error);alert("не отправилось");}
};

var searchTimer;
searchI.oninput=function(){
clearTimeout(searchTimer);
var q=searchI.value.trim().toLowerCase().replace("@","");
if(q.length<1){searchR.innerHTML="";return;}

searchTimer=setTimeout(async function(){
  var r=await db.from("profiles").select("*").ilike("username","%"+q+"%").limit(20);
  searchR.innerHTML="";
  if(!r.data||r.data.length===0){
    searchR.innerHTML='<div class="empty">Никого не найдено</div>';
    return;
  }
  for(var i=0;i<r.data.length;i++){
    (function(u){
      if(u.id===me.id)return;
      var el=document.createElement("div");
      el.className="user-row";

      var av=document.createElement("div");
      av.className="avatar";
      av.textContent=(u.username||"?").charAt(0).toUpperCase();

      var info=document.createElement("div");
      var nm=document.createElement("div");
      nm.className="user-row-name";
      nm.textContent=u.display_name||u.username;
      var un=document.createElement("div");
      un.className="user-row-user";
      un.textContent="@"+u.username;
      info.appendChild(nm);
      info.appendChild(un);

      el.appendChild(av);
      el.appendChild(info);
      el.onclick=function(){openPrivate(u);};
      searchR.appendChild(el);
    })(r.data[i]);
  }
},250);
};

function roomId(a,b){
return a<b?a+"_"+b:b+"_"+a;
}

async function openPrivate(user){
currentChat=user;
chatN.textContent=user.display_name||user.username;
chatU.textContent="@"+user.username;
chatA.textContent=(user.username||"?").charAt(0).toUpperCase();

switchTab("private");
privMsgs.innerHTML="";

var room=roomId(me.id,user.id);

var r=await db.from("messages").select("*").eq("room",room).order("id",{ascending:true}).limit(200);
if(!r.error){
  for(var i=0;i<r.data.length;i++){
    var row=r.data[i];
    var mine=row.user_id===me.id;
    privMsgs.appendChild(buildMsg(row,mine,false));
  }
  down(privMsgs);
}

if(roomChannel){db.removeChannel(roomChannel);}
roomChannel=db.channel("room_"+room)
.on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"room=eq."+room},function(p){
  var row=p.new;
  if(row.room!==room)return;
  var mine=row.user_id===me.id;
  privMsgs.appendChild(buildMsg(row,mine,false));
  down(privMsgs);
})
.subscribe();
}

privFm.onsubmit=async function(e){
e.preventDefault();
var v=privInp.value.trim();
if(!v||!me||!currentChat)return;
privInp.value="";
privInp.focus();

var room=roomId(me.id,currentChat.id);

var r=await db.from("messages").insert({
  username:myProfile.username,
  content:v,
  user_id:me.id,
  room:room
});
if(r.error){console.log(r.error);alert("не отправилось");}
};

async function loadProfileForm(){
if(!myProfile)return;
profUser.value="@"+myProfile.username;
profDisp.value=myProfile.display_name||"";
profBio.value=myProfile.bio||"";
profMsg.textContent="";
}

saveP.onclick=async function(){
profMsg.textContent="";
var d=profDisp.value.trim();
var b=profBio.value.trim();

var r=await db.from("profiles").update({
  display_name:d||myProfile.username,
  bio:b
}).eq("id",me.id);

if(r.error){profMsg.textContent=r.error.message;return;}

myProfile.display_name=d||myProfile.username;
myProfile.bio=b;
myN.textContent=myProfile.display_name;
profMsg.textContent="Сохранено ✓";
profMsg.style.color="#4caf50";
setTimeout(function(){profMsg.textContent="";},2000);
};

db.auth.getSession().then(function(r){
if(r.data.session)loginSuccess(r.data.session.user);
else showAuth();
});
