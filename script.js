const db = supabase.createClient(
"https://vxfkxkvndmuupfilxqzx.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zmt4a3ZuZG11dXBmaWx4cXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ4NDIsImV4cCI6MjEwNTQ4MDg0Mn0.zlpBvjPwjUOHRvClzb9nRDQQhd3wSfdL8M0IC-k0FF4"
);

var auth = document.getElementById("auth");
var chat = document.getElementById("chat");
var nameI = document.getElementById("authName");
var passI = document.getElementById("authPass");
var passI2 = document.getElementById("authPass2");
var loginB = document.getElementById("loginBtn");
var regB = document.getElementById("regBtn");
var errB = document.getElementById("authError");
var outB = document.getElementById("logoutBtn");
var myN = document.getElementById("myName");
var myA = document.getElementById("myAvatar");
var msgs = document.getElementById("messages");
var fm = document.getElementById("chatForm");
var inp = document.getElementById("messageInput");

var me = null;

function toMail(n) {
return n.toLowerCase().trim().replace(/[^a-z0-9а-яё_]/gi, "") + "@sotagram.local";
}

function err(t) {
errB.textContent = t || "";
}

function openChat(u) {
me = u;
auth.style.display = "none";
chat.style.display = "flex";
var nick = u.email.split("@")[0];
myN.textContent = nick;
myA.textContent = nick[0].toUpperCase();
load();
}

function openAuth() {
auth.style.display = "flex";
chat.style.display = "none";
me = null;
msgs.innerHTML = "";
}

loginB.onclick = async function() {
err("");
var n = nameI.value.trim();
var p = passI.value;
if (!n || !p) return err("заполни всё");

var r = await db.auth.signInWithPassword({email: toMail(n), password: p});
if (r.error) return err("неверный ник или пароль");
openChat(r.data.user);
};

regB.onclick = async function() {
err("");
var n = nameI.value.trim();
var p = passI.value;
var p2 = passI2.value;

if (!n || !p) return err("заполни всё");
if (n.length < 2) return err("ник короткий");
if (p.length < 4) return err("пароль от 4 символов");
if (p !== p2) return err("пароли не совпадают");

var r = await db.auth.signUp({email: toMail(n), password: p});
if (r.error) return err(r.error.message);
if (!r.data.user) return err("проверь настройки supabase");

openChat(r.data.user);
};

outB.onclick = async function() {
await db.auth.signOut();
openAuth();
};

function down() {
msgs.scrollTop = msgs.scrollHeight;
}

function draw(row) {
var mine = me && row.user_id === me.id;
var d = document.createElement("div");
d.className = mine ? "message outgoing" : "message incoming";

if (!mine) {
var n = document.createElement("strong");
n.textContent = row.username;
d.appendChild(n);
}

var p = document.createElement("p");
p.textContent = row.content;
d.appendChild(p);

var t = new Date(row.created_at);
var mm = t.getMinutes();
if (mm < 10) mm = "0" + mm;
var s = document.createElement("span");
s.className = "time";
s.textContent = t.getHours() + ":" + mm;
d.appendChild(s);

msgs.appendChild(d);
down();
}

async function load() {
var r = await db.from("messages").select("*").order("id", {ascending: true}).limit(200);
if (r.error) { console.log(r.error); return; }
msgs.innerHTML = "";
for (var i = 0; i < r.data.length; i++) draw(r.data[i]);
}

db.channel("room1")
.on("postgres_changes", {event: "INSERT", schema: "public", table: "messages"}, function(p) { draw(p.new); })
.subscribe();

fm.onsubmit = async function(e) {
e.preventDefault();
var v = inp.value.trim();
if (!v || !me) return;

var nick = me.email.split("@")[0];
inp.value = "";
inp.focus();

var r = await db.from("messages").insert({username: nick, content: v, user_id: me.id});
if (r.error) { console.log(r.error); alert("не отправилось"); }
};

db.auth.getSession().then(function(r) {
if (r.data.session) openChat(r.data.session.user);
else openAuth();
});
