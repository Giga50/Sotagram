const db = supabase.createClient(
"https://vxfkxkvndmuupfilxqzx.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4Zmt4a3ZuZG11dXBmaWx4cXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDQ4NDIsImV4cCI6MjEwNTQ4MDg0Mn0.zlpBvjPwjUOHRvClzb9nRDQQhd3wSfdL8M0IC-k0FF4"
);

var msgs = document.getElementById("messages");
var fm = document.getElementById("chatForm");
var inp = document.getElementById("messageInput");
var who = document.getElementById("usernameInput");

who.value = localStorage.getItem("name") || "Гость";
who.oninput = function() {
localStorage.setItem("name", who.value.trim() || "Гость");
};

function down() {
msgs.scrollTop = msgs.scrollHeight;
}

function draw(row) {
var d = document.createElement("div");
var me = row.username === who.value.trim();
d.className = me ? "message outgoing" : "message incoming";

if (!me) {
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

db.from("messages").select("*").order("id", {ascending: true}).limit(200)
.then(function(r) {
if (r.error) { console.log(r.error); return; }
for (var i = 0; i < r.data.length; i++) {
draw(r.data[i]);
}
});

var chan = db.channel("room1");
chan.on("postgres_changes", {event: "INSERT", schema: "public", table: "messages"}, function(p) {
draw(p.new);
});
chan.subscribe(function(st) {
console.log("realtime:", st);
});

fm.addEventListener("submit", function(e) {
e.preventDefault();
var v = inp.value.trim();
if (!v) return;

inp.value = "";
inp.focus();

db.from("messages").insert({username: who.value.trim() || "Гость", content: v})
.then(function(r) {
if (r.error) { console.log(r.error); alert("не отправилось"); }
});
});
