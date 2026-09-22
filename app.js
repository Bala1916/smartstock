const $=s=>document.querySelector(s);
const API="https://bharatstockapi.com";
let stocks=[],filter="ALL";

const demo=[
  ["NHPC",82,18,10,9,8,18,57]
].filter(x=>x[1]<=100).map(x=>({
  symbol:x[0],company:x[0],price:x[1],pe:x[2],roe:x[3],roce:x[4],
  eps_growth_yoy:x[5],return_1y:x[6],price_vs_200dma_pct:x[7]
}));

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

function reason(s){
  const positives=[],negatives=[];
  if((s.roe??0)>=15)positives.push("strong ROE");
  if((s.eps_growth_yoy??0)>=10)positives.push("EPS growth");
  if((s.revenue_growth_yoy??0)>=10)positives.push("revenue growth");
  if((s.debt_to_equity??99)<=1)positives.push("controlled debt");
  if((s.price_vs_200dma_pct??-99)>0)positives.push("above 200-DMA");
  if((s.pe??99)>35)negatives.push("high P/E");
  if((s.debt_to_equity??0)>2)negatives.push("high debt");
  if((s.volatility_30d??0)>4)negatives.push("high volatility");
  if((s.return_1m??0)<-8)negatives.push("weak 1-month trend");
  return positives.length
    ?"Positive: "+positives.slice(0,3).join(", ")+". "+(negatives.length?"Caution: "+negatives.slice(0,2).join(", "):"")
    :negatives.length?"Caution: "+negatives.slice(0,3).join(", ")+".":"Mixed/limited data; review the details.";
}

function render(){
  const a=stocks.map(s=>({...s,score:score(s),signal:signal(score(s))}))
    .filter(s=>n(s.price)!=null&&n(s.price)<=100);
  const b=a.filter(s=>filter==="ALL"||s.signal===filter).sort((x,y)=>y.score-x.score);

  $("#scanned").textContent=a.length;
  $("#buy").textContent=a.filter(x=>x.signal==="BUY").length;
  $("#watch").textContent=a.filter(x=>x.signal==="WATCH").length;
  $("#avoid").textContent=a.filter(x=>x.signal==="AVOID").length;

  $("#list").innerHTML=b.map(s=>`
    <article class="card" data-symbol="${s.symbol}">
      <div class="top">
        <div>
          <div class="symbol">${s.symbol}</div>
          <div class="company">${s.company_name||s.company||""}</div>
          <div class="price">₹${Number(s.price).toLocaleString("en-IN",{maximumFractionDigits:2})}</div>
        </div>
        <div>
          <div class="score">${s.score}/100</div>
          <span class="badge ${s.signal.toLowerCase()}">${s.signal}</span>
        </div>
      </div>
      <div class="metrics">
        <div class="metric"><b>${fmt(s.pe,"x")}</b>P/E</div>
        <div class="metric"><b>${fmt(s.roe,"%")}</b>ROE</div>
        <div class="metric"><b>${fmt(s.eps_growth_yoy,"%")}</b>EPS growth</div>
        <div class="metric"><b>${fmt(s.return_1y,"%")}</b>1Y return</div>
      </div>
      <div class="reason">${reason(s)}</div>
    </article>`).join("")||"<div class='card'>No stocks matched the current filter.</div>";

  document.querySelectorAll(".card[data-symbol]").forEach(c=>
    c.onclick=()=>show(a.find(x=>x.symbol===c.dataset.symbol))
  );
}

function show(s){
  $("#detailBody").innerHTML=`
    <h2>${s.symbol} — ${s.signal} ${s.score}/100</h2>
    <p><b>Price:</b> ₹${Number(s.price).toLocaleString("en-IN",{maximumFractionDigits:2})}</p>
    <p>
      P/E: ${fmt(s.pe,"x")}<br>
      ROE: ${fmt(s.roe,"%")}<br>
      ROCE: ${fmt(s.roce,"%")}<br>
      Revenue growth: ${fmt(s.revenue_growth_yoy,"%")}<br>
      Profit growth: ${fmt(s.profit_growth_yoy,"%")}<br>
      EPS growth: ${fmt(s.eps_growth_yoy,"%")}<br>
      Debt/Equity: ${fmt(s.debt_to_equity,"")}<br>
      1M return: ${fmt(s.return_1m,"%")}<br>
      1Y return: ${fmt(s.return_1y,"%")}<br>
      Volatility (30D): ${fmt(s.volatility_30d,"%")}<br>
      Price vs 200-DMA: ${fmt(s.price_vs_200dma_pct,"%")}<br>
      52W high distance: ${fmt(s.distance_from_52w_high_pct,"%")}<br>
      52W low distance: ${fmt(s.distance_from_52w_low_pct,"%")}<br>
      Avg volume (30D): ${fmt(s.avg_volume_30d)}<br>
      Promoter holding: ${fmt(s.promoter_holding,"%")}<br>
      FII holding: ${fmt(s.fii_holding,"%")}<br>
      DII holding: ${fmt(s.dii_holding,"%")}
    </p>
    <p>${reason(s)}</p>`;
  $("#details").showModal();
}

async function get(path,key){
  let r;
  try{
    r=await fetch(API+path,{
      method:"GET",
      headers:{
        "X-API-Key":key,
        "Accept":"application/json"
      },
      cache:"no-store"
    });
  }catch(e){
    throw new Error("NETWORK/CORS: "+(e?.message||"Failed to fetch"));
  }
  if(!r.ok){
    let detail="";
    try{
      const body=await r.json();
      detail=body?.detail || body?.error || "";
      if(Array.isArray(detail)) detail=detail.map(x=>x.msg||JSON.stringify(x)).join("; ");
    }catch(_){}
    throw new Error(`HTTP ${r.status}${detail?": "+detail:""}`);
  }
  return r.json();
}

function humanError(e){
  const m=String(e?.message||e);
  if(m.includes("401")) return "API key rejected (401). Delete the saved key and enter the newly generated BharatStock key.";
  if(m.includes("429")) return "Daily API limit reached (429). BharatStock Free has 50 requests/day; the quota resets at UTC midnight.";
  if(m.includes("403")) return "API access denied (403). Check the BharatStock plan/key permissions.";
  if(m.includes("422")) return "BharatStock rejected the request (422). The app request format needs correction.";
  if(m.includes("NETWORK/CORS")) return "Browser could not reach BharatStock (CORS/network). This requires a small server-side proxy; the API key itself is not the issue.";
  return m;
}

async function refresh(){
  const key=localStorage.getItem("smartstock_key");
  if(!key){
    stocks=demo;
    $("#status").textContent="Demo mode";
    $("#msg").textContent="Add your BharatStock key under ⚙ Data to analyse the under-₹100 universe.";
    $("#date").textContent=new Date().toLocaleDateString("en-IN");
    render();
    return;
  }

  $("#refresh").disabled=true;
  $("#msg").textContent="Scanning NSE stocks priced ₹100 or below…";
  try{
    let all=[],page=1,totalPages=1;

    // BharatStock screener uses repeatable filter parameters.
    // page_size max is 200. We follow pagination metadata instead of guessing.
    while(page<=totalPages && page<=20){
      const params=new URLSearchParams({
        page:String(page),
        page_size:"200",
        exchange:"NSE",
        sort_by:"market_cap",
        sort_order:"desc"
      });
      params.append("filter","price.lte.100");

      const r=await get("/v1/screener?"+params.toString(),key);
      const rows=Array.isArray(r.data)?r.data:[];
      all.push(...rows);
      totalPages=Number(r.pagination?.total_pages||1);

      if(!rows.length) break;
      page++;
    }

    stocks=all.filter(s=>n(s.price)!=null&&n(s.price)<=100);

    if(!stocks.length) throw new Error("The API returned no NSE stocks at or below ₹100.");

    $("#status").textContent="BharatStock • latest available daily data";
    $("#msg").textContent=`Analysed ${stocks.length} NSE stocks at ₹100 or below.`;
    $("#date").textContent=new Date().toLocaleDateString("en-IN");
    render();
  }catch(e){
    console.error("SmartStock BharatStock error:",e);
    $("#msg").textContent="Live analysis failed: "+humanError(e);
    if(!stocks.length) stocks=demo;
    render();
  }finally{
    $("#refresh").disabled=false;
  }
}

$("#refresh").onclick=refresh;
$("#dataBtn").onclick=()=>{
  $("#key").value=localStorage.getItem("smartstock_key")||"";
  $("#settings").showModal();
};
$("#close").onclick=()=>$("#settings").close();
$("#save").onclick=()=>{
  const k=$("#key").value.trim();
  if(k){
    localStorage.setItem("smartstock_key",k);
    $("#settings").close();
    stocks=[];
    refresh();
  }
};
$("#remove").onclick=()=>{
  localStorage.removeItem("smartstock_key");
  $("#settings").close();
  stocks=demo;
  $("#status").textContent="Demo mode";
  $("#msg").textContent="API key removed.";
  render();
};
document.querySelectorAll("#filters button").forEach(b=>b.onclick=()=>{
  filter=b.dataset.f;
  document.querySelectorAll("#filters button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  render();
});
refresh();
