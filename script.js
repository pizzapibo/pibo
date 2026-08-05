// =====================================
// PIBO AR
// Version 1.0
// =====================================

// گرفتن اطلاعات از URL
const params = new URLSearchParams(window.location.search);

// مثال:
// ?pizza=pepperoni

const pizzaID = params.get("pizza") || "margherita";

// پیدا کردن اطلاعات پیتزا

const pizza = pizzas[pizzaID];

if (!pizza) {

    document.body.innerHTML = `
        <div style="
            display:flex;
            justify-content:center;
            align-items:center;
            height:100vh;
            font-size:30px;
            font-family:sans-serif;
        ">
        پیتزا پیدا نشد 🍕
        </div>
    `;

    throw new Error("Pizza not found");

}

// گرفتن المان‌ها

const viewer = document.getElementById("viewer");

const title = document.getElementById("pizzaName");

const desc = document.getElementById("pizzaDesc");

const size = document.getElementById("pizzaSize");

const weight = document.getElementById("pizzaWeight");

const button = document.getElementById("arButton");

const loading = document.getElementById("loading");

const app = document.getElementById("app");

const progress = document.getElementById("progressBar");

// قرار دادن اطلاعات روی صفحه

title.innerText = pizza.name;

desc.innerText = pizza.description;

size.innerText = pizza.size;

weight.innerText = pizza.weight;

// مدل سه بعدی

if (pizza.glb) {

    viewer.src = pizza.glb;

}

if (pizza.usdz) {

    viewer.setAttribute("ios-src", pizza.usdz);

}

if (pizza.poster) {

    viewer.poster = pizza.poster;

}

// لودینگ

let percent = 0;

const fakeLoading = setInterval(() => {

    percent += 2;

    if (percent > 95) {

        percent = 95;

        clearInterval(fakeLoading);

    }

    progress.style.width = percent + "%";

},40);
// =====================================
// Model Loaded
// =====================================

window.addEventListener("load", () => {

    setTimeout(()=>{

        progress.style.width="100%";

        loading.style.opacity="0";

        setTimeout(()=>{

            loading.style.display="none";

            app.style.display="block";

        },400);

    },800);

});

// =====================================
// Error Loading
// =====================================

viewer.addEventListener("error", () => {

    loading.innerHTML = `

        <div style="font-size:80px;">
        ⚠️
        </div>

        <h2>
        خطا در بارگذاری مدل
        </h2>

        <p>
        اتصال اینترنت یا فایل سه بعدی را بررسی کنید.
        </p>

    `;

});

// =====================================
// Open AR
// =====================================

button.addEventListener("click",()=>{

    if(viewer.canActivateAR){

        viewer.activateAR();

    }

});

// =====================================
// Auto Rotate Speed
// =====================================

viewer.setAttribute(

"rotation-per-second",

"18deg"

);

// =====================================
// Camera Orbit
// =====================================

viewer.cameraOrbit="45deg 70deg 2.3m";

// =====================================
// Field Of View
// =====================================

viewer.fieldOfView="30deg";

// =====================================
// Exposure
// =====================================

viewer.exposure=1.15;

// =====================================
// Shadow
// =====================================

viewer.shadowIntensity=1.5;

// =====================================
// Disable Context Menu
// =====================================

document.addEventListener(

"contextmenu",

e=>e.preventDefault()

);

// =====================================
// Disable Image Drag
// =====================================

document.addEventListener(

"dragstart",

e=>e.preventDefault()

);

// =====================================
// Reset Camera
// =====================================

function resetCamera(){

viewer.cameraOrbit="45deg 70deg 2.3m";

viewer.jumpCameraToGoal();

}

// =====================================
// Double Click Reset
// =====================================

viewer.addEventListener(

"dblclick",

()=>{

resetCamera();

}

);

// =====================================
// Full Screen
// =====================================

function fullscreen(){

if(document.fullscreenElement){

document.exitFullscreen();

}else{

document.documentElement.requestFullscreen();

}

}

// =====================================
// Keyboard
// =====================================

document.addEventListener(

"keydown",

(e)=>{

if(e.key==="f"){

fullscreen();

}

if(e.key==="r"){

resetCamera();

}

}

);

// =====================================
// FPS Improve
// =====================================

viewer.setAttribute(

"loading",

"lazy"

);

viewer.setAttribute(

"reveal",

"interaction"

);

// =====================================
// Poster
// =====================================

viewer.poster=pizza.poster;

// =====================================
// Console
// =====================================

console.log(

"PIBO AR Loaded"

);

console.log(

pizza

);
// ===========================================
// PIBO AR PRO
// Part 3
// ===========================================

// ---------- Share Button ----------

const shareBtn=document.createElement("button");

shareBtn.innerHTML="اشتراک گذاری";

shareBtn.id="shareButton";

document.querySelector(".card").appendChild(shareBtn);

shareBtn.onclick=async()=>{

if(navigator.share){

await navigator.share({

title:pizza.name,

text:pizza.description,

url:window.location.href

});

}else{

navigator.clipboard.writeText(window.location.href);

alert("لینک کپی شد.");

}

};

// ---------- Floating AR Button ----------

const floatButton=document.createElement("button");

floatButton.innerHTML="AR";

floatButton.id="floatingAR";

document.body.appendChild(floatButton);

floatButton.onclick=()=>{

viewer.activateAR();

};

// ---------- Floating Animation ----------

let scale=1;

setInterval(()=>{

scale=scale==1?1.08:1;

floatButton.style.transform=`scale(${scale})`;

},800);

// ---------- Viewer Fade ----------

viewer.style.opacity=0;

viewer.style.transition="1s";

viewer.addEventListener("load",()=>{

viewer.style.opacity=1;

});

// ---------- Button Ripple ----------

button.addEventListener("click",(e)=>{

const ripple=document.createElement("span");

ripple.className="ripple";

button.appendChild(ripple);

const x=e.offsetX;

const y=e.offsetY;

ripple.style.left=x+"px";

ripple.style.top=y+"px";

setTimeout(()=>{

ripple.remove();

},700);

});

// ---------- Cache ----------

if("caches" in window){

caches.open("pibo-cache-v1")

.then(cache=>{

cache.add(pizza.poster);

cache.add(pizza.glb);

});

}

// ---------- Detect iPhone ----------

const isiPhone=/iPhone|iPad|iPod/i.test(

navigator.userAgent

);

if(isiPhone){

console.log("Apple Device");

}

// ---------- Detect Android ----------

const isAndroid=/Android/i.test(

navigator.userAgent

);

if(isAndroid){

console.log("Android Device");

}

// ---------- FPS ----------

let fps=0;

let last=performance.now();

function updateFPS(){

const now=performance.now();

fps=Math.round(

1000/(now-last)

);

last=now;

requestAnimationFrame(updateFPS);

}

updateFPS();

// ---------- Analytics ----------

let count=localStorage.getItem(

pizzaID

);

if(!count){

count=0;

}

count++;

localStorage.setItem(

pizzaID,

count

);

console.log(

"Opened",

count,

"times"

);

// ---------- QR Copy ----------

function copyQR(){

navigator.clipboard.writeText(

window.location.href

);

}

window.copyQR=copyQR;

// ---------- Loader Text ----------

const texts=[

"درحال آماده سازی...",

"درحال دانلود مدل...",

"تقریبا آماده است..."

];

let i=0;

setInterval(()=>{

const t=document.querySelector(

".loading-text"

);

if(t){

t.innerHTML=texts[i];

i++;

if(i>=texts.length){

i=0;

}

}

},1800);

// ---------- Auto Hide Cursor ----------

let timer;

document.addEventListener(

"mousemove",

()=>{

document.body.style.cursor="default";

clearTimeout(timer);

timer=setTimeout(()=>{

document.body.style.cursor="none";

},2500);

});

// ---------- Keyboard ----------

document.addEventListener(

"keydown",

(e)=>{

switch(e.key){

case "a":

viewer.activateAR();

break;

case "Escape":

document.exitFullscreen();

break;

}

});

// ---------- Welcome ----------

console.log(

"%cPIBO AR PRO",

"font-size:30px;color:#ff7a00;font-weight:bold;"

);

console.log(

"Welcome."

);
if("serviceWorker" in navigator){

window.addEventListener("load",()=>{

navigator.serviceWorker.register("sw.js")

.then(()=>{

console.log("Service Worker Ready");

})

.catch(err=>{

console.log(err);

});

});

}
// ===========================================
// END
// ===========================================
