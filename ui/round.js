(function(){"use strict";var STORE_KEY="fxReserve";var START_BANK=1000;var EDGE=0.97;var MULT_CAP=100;var GROWTH=0.13;var STAKE_STEP=5;var STAKE_MAX=100000;var HISTORY_MAX=12;var GONE_ANIM_MS=900;var GONE_HOLD_MS=2100;var canvas=document.getElementById("fx_curve");var multEl=document.getElementById("fx_mult");var bankEl=document.getElementById("fx_bank");var refillEl=document.getElementById("fx_refill");var stakeEl=document.getElementById("fx_stake");var lessEl=document.getElementById("fx_less");var moreEl=document.getElementById("fx_more");var autoEl=document.getElementById("fx_auto");var launchEl=document.getElementById("fx_launch");var collectEl=document.getElementById("fx_collect");var feedEl=document.getElementById("fx_feed");var stripEl=document.getElementById("fx_strip");if(!canvas||!canvas.getContext||!multEl||!bankEl||!refillEl||!stakeEl||!lessEl||!moreEl||!autoEl||!launchEl||!collectEl||!feedEl||!stripEl){return;}
var ctx=canvas.getContext("2d");var bank=loadBank();var phase="idle";var round=null;var history=[];var rafId=0;var goneAt=0;var view={w:640,h:300};function loadBank(){var raw=null;try{raw=window.localStorage.getItem(STORE_KEY);}catch(err){raw=null;}
if(raw===null||raw===""){return START_BANK;}
var value=Number(raw);if(!isFinite(value)||value<0){return START_BANK;}
return round2(value);}
function saveBank(){try{window.localStorage.setItem(STORE_KEY,String(bank));}catch(err){return;}}
function renderBank(){bankEl.textContent=fmtCash(bank);}
function round2(value){return Math.round(value*100)/100;}
function fmtCash(value){var v=round2(value);return v===Math.floor(v)?String(v):v.toFixed(2);}
function fmtMult(value){return value.toFixed(2)+"×";}
function say(text,mood){feedEl.textContent=text;feedEl.classList.remove("fx_up","fx_down");if(mood){feedEl.classList.add(mood);}}
function sampleCrash(){var u=Math.random();var value=EDGE/(1-u);if(value<1){value=1;}
if(value>MULT_CAP){value=MULT_CAP;}
return Math.floor(value*100)/100;}
function multAt(seconds){var m=Math.exp(GROWTH*seconds);return m>MULT_CAP?MULT_CAP:m;}
function readStake(){var value=Math.floor(Number(stakeEl.value));return isFinite(value)?value:0;}
function clampStake(){var value=readStake();if(value<1){value=1;}
if(value>STAKE_MAX){value=STAKE_MAX;}
stakeEl.value=String(value);}
function nudgeStake(delta){if(phase!=="idle"){return;}
var value=readStake()+delta;if(value<1){value=1;}
if(value>STAKE_MAX){value=STAKE_MAX;}
stakeEl.value=String(value);}
function readAuto(){var raw=autoEl.value;if(raw===""||raw===null){return 0;}
var value=Number(raw);if(!isFinite(value)||value<=0){return 0;}
if(value<1.01){value=1.01;}
if(value>MULT_CAP){value=MULT_CAP;}
return Math.floor(value*100)/100;}
function tidyAuto(){var value=readAuto();autoEl.value=value>0?value.toFixed(2):"";}
function lockConsole(locked){stakeEl.disabled=locked;lessEl.disabled=locked;moreEl.disabled=locked;autoEl.disabled=locked;launchEl.disabled=locked;refillEl.disabled=locked;}
function pushHistory(mult){history.unshift(mult);if(history.length>HISTORY_MAX){history.pop();}
stripEl.innerHTML="";for(var i=0;i<history.length;i+=1){var li=document.createElement("li");var v=history[i];var tone=v<2?"fx_chip_low":v<10?"fx_chip_mid":"fx_chip_high";li.className="fx_chip-d6c96d6f"+tone;li.textContent=fmtMult(v);stripEl.appendChild(li);}}
function fitCanvas(){var host=canvas.parentNode;var w=host&&host.clientWidth?host.clientWidth:640;if(w<220){w=220;}
var h=Math.round(w*0.44);if(h<190){h=190;}
if(h>360){h=360;}
var dpr=window.devicePixelRatio||1;view.w=w;view.h=h;canvas.style.width=w+"px";canvas.style.height=h+"px";canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
function drawGrid(w,h){var i;ctx.strokeStyle="#212228";ctx.lineWidth=1;ctx.beginPath();for(i=1;i<8;i+=1){var gx=Math.round((w/8)*i)+0.5;ctx.moveTo(gx,0);ctx.lineTo(gx,h);}
for(i=1;i<5;i+=1){var gy=Math.round((h/5)*i)+0.5;ctx.moveTo(0,gy);ctx.lineTo(w,gy);}
ctx.stroke();}
function drawPlane(x,y,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle="#f4f5f7";ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-9,-4);ctx.lineTo(-11,0);ctx.lineTo(-9,4);ctx.closePath();ctx.fill();ctx.fillStyle="#e11d48";ctx.beginPath();ctx.moveTo(3,-1);ctx.lineTo(-4,-10);ctx.lineTo(-7,-1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-8,-3);ctx.lineTo(-13,-8);ctx.lineTo(-11,-1);ctx.closePath();ctx.fill();ctx.restore();}
function drawIdle(){var w=view.w;var h=view.h;ctx.clearRect(0,0,w,h);drawGrid(w,h);drawPlane(18,h-20,-0.26);ctx.fillStyle="#5d6270";ctx.font="12px 'Fira Mono', monospace";ctx.textAlign="left";ctx.fillText("awaiting departure",38,h-16);}
function drawGoneLabel(w,h,crash){ctx.textAlign="center";ctx.fillStyle="#e11d48";ctx.font="700 26px Barlow, sans-serif";ctx.fillText("FLEW AWAY",w/2,h/2-8);ctx.fillStyle="#9a9fab";ctx.font="16px 'Fira Mono', monospace";ctx.fillText(fmtMult(crash),w/2,h/2+18);ctx.textAlign="left";}
function drawFlight(t,m,goneP){var w=view.w;var h=view.h;ctx.clearRect(0,0,w,h);drawGrid(w,h);var padL=14;var padR=56;var padT=36;var padB=18;var plotW=w-padL-padR;var plotH=h-padT-padB;var tMax=Math.max(9,t*1.06);var mMax=Math.max(1.9,m*1.22);var x0=padL;var y0=h-padB;var steps=72;var pts=[];for(var i=0;i<=steps;i+=1){var s=t*(i/steps);var ms=multAt(s);if(ms>m){ms=m;}
pts.push([x0+(s/tMax)*plotW,y0-((ms-1)/(mMax-1))*plotH]);}
var tip=pts[pts.length-1];var prev=pts.length>1?pts[pts.length-2]:pts[0];ctx.beginPath();ctx.moveTo(x0,y0);for(var f=0;f<pts.length;f+=1){ctx.lineTo(pts[f][0],pts[f][1]);}
ctx.lineTo(tip[0],y0);ctx.closePath();var grad=ctx.createLinearGradient(0,padT,0,y0);grad.addColorStop(0,"rgba(225, 29, 72, 0.30)");grad.addColorStop(1,"rgba(225, 29, 72, 0.03)");ctx.fillStyle=grad;ctx.fill();ctx.beginPath();ctx.moveTo(x0,y0);for(var k=0;k<pts.length;k+=1){ctx.lineTo(pts[k][0],pts[k][1]);}
ctx.strokeStyle="#e11d48";ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();var angle=Math.atan2(tip[1]-prev[1],tip[0]-prev[0]);if(goneP>0){var away=angle-0.35;var dist=goneP*w*0.45;ctx.globalAlpha=Math.max(0.12,1-goneP*0.9);drawPlane(tip[0]+Math.cos(away)*dist,tip[1]+Math.sin(away)*dist,away);ctx.globalAlpha=1;drawGoneLabel(w,h,round.crashAt);}else{drawPlane(tip[0],tip[1],angle);}}
function schedule(){if(!rafId){rafId=window.requestAnimationFrame(frame);}}
function frame(now){rafId=0;if(phase==="flight"&&round){var t=(now-round.t0)/1000;var m=multAt(t);if(!round.banked&&round.autoAt>0&&round.autoAt<round.crashAt&&m>=round.autoAt){bankWin(round.autoAt,true);}
if(m>=round.crashAt){blowUp(now);}else{multEl.textContent=fmtMult(m);drawFlight(t,m,0);schedule();}}else if(phase==="gone"&&round){var p=(now-goneAt)/GONE_ANIM_MS;if(p>1){p=1;}
drawFlight(round.tEnd,round.crashAt,p);if(p<1){schedule();}}}
function startRound(){if(phase!=="idle"){return;}
clampStake();tidyAuto();var stake=readStake();if(stake<1){say("The stake must be at least 1 credit.","fx_down");return;}
if(stake>bank){say("Reserve too low for that stake — trim it down.","fx_down");return;}
bank=round2(bank-stake);saveBank();renderBank();round={stake:stake,autoAt:readAuto(),crashAt:sampleCrash(),t0:window.performance.now(),banked:false,bankedAt:0,tEnd:0};phase="flight";lockConsole(true);collectEl.disabled=false;multEl.classList.remove("fx_mult_gone-d6c96d6f");if(round.autoAt>0){say("Airborne. Auto cash-out armed at "+
fmtMult(round.autoAt)+".","");}else{say("Airborne. Cash out before the plane departs.","");}
schedule();}
function bankWin(mult,auto){var gain=round2(round.stake*mult);round.banked=true;round.bankedAt=mult;bank=round2(bank+gain);saveBank();renderBank();collectEl.disabled=true;say((auto?"Auto cash-out fired at ":"Cashed out at ")+
fmtMult(mult)+" for "+fmtCash(gain)+". Watching the rest of the flight.","fx_up");}
function cashOut(){if(phase!=="flight"||!round||round.banked){return;}
var t=(window.performance.now()-round.t0)/1000;var m=multAt(t);if(m>=round.crashAt){return;}
bankWin(m,false);}
function blowUp(now){phase="gone";goneAt=now;round.tEnd=(now-round.t0)/1000;multEl.textContent=fmtMult(round.crashAt);multEl.classList.add("fx_mult_gone-d6c96d6f");collectEl.disabled=true;pushHistory(round.crashAt);if(round.banked){say("Departed at "+fmtMult(round.crashAt)+" — you had already banked "+
fmtCash(round.stake*round.bankedAt)+".","fx_up");}else{say("Flew away at "+fmtMult(round.crashAt)+" and took the stake with it.","fx_down");}
schedule();window.setTimeout(settleRound,GONE_HOLD_MS);}
function settleRound(){phase="idle";round=null;lockConsole(false);collectEl.disabled=true;multEl.textContent="1.00×";multEl.classList.remove("fx_mult_gone-d6c96d6f");drawIdle();if(bank<1){say("Reserve is empty — press Refill to restock the demo "+"credits.","fx_down");}}
function refill(){if(phase!=="idle"){return;}
bank=START_BANK;saveBank();renderBank();say("Reserve restocked to "+START_BANK+" demo credits.","");}
launchEl.addEventListener("click",startRound);collectEl.addEventListener("click",cashOut);refillEl.addEventListener("click",refill);lessEl.addEventListener("click",function(){nudgeStake(-STAKE_STEP);});moreEl.addEventListener("click",function(){nudgeStake(STAKE_STEP);});stakeEl.addEventListener("change",clampStake);autoEl.addEventListener("change",tidyAuto);window.addEventListener("resize",function(){fitCanvas();if(phase==="idle"){drawIdle();}});fitCanvas();drawIdle();renderBank();if(bank<1){say("Reserve is empty — press Refill to restock the demo "+"credits.","");}})();