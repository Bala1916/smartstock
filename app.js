const $=s=>document.querySelector(s);
const API="https://bharatstockapi.com";
let stocks=[],filter="ALL";
const demo=[["ONGC",262.5,7.8,18.5,22.1,22.1,15.3,55],["IOCL",137,7.2,18,15,12,8,48],["IRFC",128,18,12,6,15,20,52],["NHPC",82,18,10,9,8,18,57],["ITC",430,28,28,34,8.5,10,60]].filter(x=>x[1]<=100).map(x=>({symbol:x[0],company:x[0],price:x[1],pe:x[2],roe:x[3],roce:x[4],eps:x[5],ret1y:x[6],price200:x[7]}));
function clamp(x){return Math.max(0,Math.min(100,x??50))}
function n(v){return v==null||Number.isNaN(+v)?null:+v}
function score(s){
  const valuation=s.pe==null?50:clamp(100-(s.pe-8)*2.2);
  const quality=clamp((n(s.roe)??10)*2+(n(s.roce)??10)*1.5);
  const growth=clamp((n(s.revenue_growth_yoy)??0)*2+(n(s.eps_growth_yoy)??0)*2+(n(s.profit_growth_yoy)??0)*1.2);
  const balance=s.debt_to_equity==null?50:clamp(100-s.debt_to_equity*45);
  const trend=clamp(50+(n(s.price_vs_200dma_pct)??0)*3);
  const returns=clamp(50+(n(s.return_1m)??0)*3+(n(s.return_1y)??0)*.35);
  const cash=s.cfo_to_net_profit==null?50:clamp(s.cfo_to_net_profit*50);
  const risk=s.volatility_30d==null?50:clamp(100-s.volatility_30d*15);
  return Math.round(valuation*.18+quality*.18+growth*.18+balance*.12+trend*.12+returns*.08+cash*.07+risk*.07);
}
function signal(x){return x>=78?"BUY":x>=62?"WATCH":"AVOID"}
function fmt(v,s=""){return v==null?"—":(+v).toFixed(1)+s}
function reason(s,x){
  const positives=[];const negatives=[];
  if((s.roe??0)>=15)positives.push("strong ROE");if((s.eps_growth_yoy??0)>=10)positives.push("EPS growth");if((s.revenue_growth_yoy??0)>=10)positives.push("revenue growth");if((s.debt_to_equity??99)<=1)positives.push("controlled debt");if((s.price_vs_200dma_pct??-99)>0)positives.push("above 200-DMA");
  if((s.pe??99)>35)negatives.push("high P/E");if((s.debt_to_equity??0)>2)negatives.push("high debt");if((s.volatility_30d??0)>4)negatives.push("high volatility");if((s.return_1m??0)<-8)negatives.push("weak 1-month trend");
  return positives.length?"Positive: "+positives.slice(0,3).join(", ")+". "+(negatives.length?"Caution: "+negatives.slice(0,2).join(", ")+".":""):negatives.length?"Caution: "+negatives.slice(0,3).join(", ")+".":"Mixed/limited data; review the details.";
}
function render(){
  const a=stocks.map(s=>({...s,score:score(s),signal:signal(score(s))})).filter(s=>n(s.price)!=null&&n(s.price)<=100);
  const b=a.filter(s=>filter==="ALL"||s.signal===filter).sort((x,y)=>y.score-x.score);
  $("#scanned").textContent=a.length;$("#buy").textContent=a.filter(x=>x.signal==="BUY").length;$("#watch").textContent=a.filter(x=>x.signal==="WATCH").length;$("#avoid").textContent=a.filter(x=>x.signal==="AVOID").length;
  $("#list").innerHTML=b.map(s=>`<article class="card" data-symbol="${s.symbol}"><div class="top"><div><div class="symbol">${s.symbol}</div><div class="company">${s.company_name||s.company||""}</div><div class="price">₹${Number(s.price).toLocaleString("en-IN",{maximumFractionDigits:2})}</div></div><div><div class="score">${s.score}/100</div><span class="badge ${s.signal.toLowerCase()}">${s.signal}</span></div></div><div class="metrics"><div class="metric"><b>${fmt(s.pe,"x")}</b>P/E</div><div class="metric"><b>${fmt(s.roe,"%")}</b>ROE</div><div class="metric"><b>${fmt(s.eps_growth_yoy,"%")}</b>EPS growth</div><div class="metric"><b>${fmt(s.return_1y,"%")}</b>1Y return</div></div><div class="reason">${reason(s,s.score)}</div></article>`).join("")||"<div class='card'>No stocks matched the current filter.</div>";
  document.querySelectorAll(".card[data-symbol]").forEach(c=>c.onclick=()=>show(a.find(x=>x.symbol===c.dataset.symbol)));
}
function show(s){$("#detailBody").innerHTML=`<h2>${s.symbol} — ${s.signal} ${s.score}/100</h2><p><b>Price:</b> ₹${Number(s.price).toLocaleString("en-IN",{maximumFractionDigits:2})}</p><p>P/E: ${fmt(s.pe,"x")}<br>ROE: ${fmt(s.roe,"%")}<br>ROCE: ${fmt(s.roce,"%")}<br>Revenue growth: ${fmt(s.revenue_growth_yoy,"%")}<br>Profit growth: ${fmt(s.profit_growth_yoy,"%")}<br>EPS growth: ${fmt(s.eps_growth_yoy,"%")}<br>Debt/Equity: ${fmt(s.debt_to_equity,"")}<br>1M return: ${fmt(s.return_1m,"%")}<br>1Y return: ${fmt(s.return_1y,"%")}<br>Volatility (30D): ${fmt(s.volatility_30d,"%")}<br>Price vs 200-DMA: ${fmt(s.price_vs_200dma_pct,"%")}<br>Promoter holding: ${fmt(s.promoter_holding,"%")}<br>FII holding: ${fmt(s.fii_holding,"%")}<br>DII holding: ${fmt(s.dii_holding,"%")}</p><p>${reason(s,s.score)}</p>`;$("#details").showModal()}
async function get(path,key){const r=await fetch(API+path,{headers:{"X-API-Key":key}});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
async function refresh(){
 const key=localStorage.getItem("smartstock_key");
 if(!key){stocks=demo;$("#status").textContent="Demo mode";$("#msg").textContent="Add your BharatStock key under ⚙ Data to analyse the full under-₹100 universe.";$("#date").textContent=new Date().toLocaleDateString("en-IN");render();return}
 $("#refresh").disabled=true;$("#msg").textContent="Scanning Indian stocks priced ₹100 or below…";
 try{
   let all=[],page=1;
   // 200 per page. The free plan allows 50 requests/day; this can use multiple requests for a full universe.
   while(page<=25){
     const u="/v1/screener?page="+page+"&page_size=200&exchange=NSE&sort_by=market_cap&sort_order=desc&filter=price.lte.100";
     const r=await get(u,key);const rows=r.data||r.results||[];if(!rows.length)break;
     all=all.concat(rows);if(rows.length<200)break;page++;
   }
   stocks=all.filter(s=>n(s.price)!=null&&n(s.price)<=100);
   if(!stocks.length)throw Error("No results");
   $("#status").textContent="BharatStock • latest available daily data";
   $("#msg").textContent=`Analysed ${stocks.length} NSE stocks at ₹100 or below.`;
   $("#date").textContent=new Date().toLocaleDateString("en-IN");
   render();
 }catch(e){$("#msg").textContent="Live analysis failed. Check the API key or daily request limit.";if(!stocks.length)stocks=demo;render()}finally{$("#refresh").disabled=false}
}
$("#refresh").onclick=refresh;$("#dataBtn").onclick=()=>{$("#key").value="";$("#settings").showModal()};$("#close").onclick=()=>$("#settings").close();$("#save").onclick=()=>{const k=$("#key").value.trim();if(k){localStorage.setItem("smartstock_key",k);$("#settings").close();refresh()}};$("#remove").onclick=()=>{localStorage.removeItem("smartstock_key");$("#settings").close();stocks=demo;render()};document.querySelectorAll("#filters button").forEach(b=>b.onclick=()=>{filter=b.dataset.f;document.querySelectorAll("#filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});refresh();
