import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildPackages, money, promotionWhatsApp } from './engine/promotions';
import { CATALOG_REFRESH_INTERVAL, fetchCatalog } from './services/catalog';
import type { Product, PackageResult } from './types';
import './styles.css';

const demo: Product[] = [
 {id:'A',name:'Producto Premium A',price:30000,isFullPrice:true,eligible:true,category:'Demostración'},
 {id:'B',name:'Producto Premium B',price:20000,isFullPrice:true,eligible:true,category:'Demostración'},
 {id:'C',name:'Producto Premium C',price:10000,isFullPrice:true,eligible:true,category:'Demostración'},
 {id:'D',name:'Producto Regalo D',price:12000,isFullPrice:true,eligible:true,category:'Demostración'},
];

function SearchSelect({label,help,products,value,onChange,exclude}:{label:string;help:string;products:Product[];value:Product|null;onChange:(p:Product|null)=>void;exclude:Product[]}){
 const [q,setQ]=useState(''); const filtered=useMemo(()=>products.filter(p=>!exclude.some(e=>e.id===p.id)&&p.name.toLowerCase().includes(q.toLowerCase())).slice(0,30),[products,exclude,q]);
 return <div className="selector"><div className="selector-label"><span>{label}</span><small>{help}</small></div>
  <div className="search-wrap"><input value={value?.name ?? q} onChange={e=>{onChange(null);setQ(e.target.value)}} placeholder="Buscar producto..." />{value && <button className="clear" onClick={()=>{onChange(null);setQ('')}}>×</button>}</div>
  {!value && q && <div className="results">{filtered.length?filtered.map(p=><button key={p.id} onClick={()=>{onChange(p);setQ('')}}><span>{p.name}</span><b>{money(p.price)}</b></button>):<div className="empty">Sin coincidencias</div>}</div>}
  {value && <div className="selected-pill"><span>{value.name}</span><b>{money(value.price)}</b></div>}
 </div>
}

function PackageCard({pkg}:{pkg:PackageResult}){ const copy=async()=>{try{await navigator.clipboard.writeText(promotionWhatsApp(pkg));alert('Promoción copiada para WhatsApp.')}catch{alert('No se pudo copiar automáticamente.')}}; return <article className={`package rank-${pkg.rank}`}>
 <div className="package-head"><div><span className="eyebrow">OPCIÓN {pkg.rank}</span><h3>{pkg.title}</h3></div><span className="badge">{pkg.promotion?.kind ?? 'SIN PROMOCIÓN'}</span></div>
 <div className="product-lines">{pkg.purchased.map(p=><div key={p.id}><span>{p.name}</span><b>{money(p.price)}</b></div>)}</div>
 {pkg.benefitProducts.length>0 && <div className="gift"><div><span>🎁 REGALO</span><strong>{pkg.benefitProducts.map(p=>p.name).join(', ')}</strong></div><b>{money(pkg.benefitValue)}</b></div>}
 <div className="numbers"><div><span>Precio normal</span><strong>{money(pkg.normalPrice)}</strong></div><div><span>Beneficio</span><strong>{money(pkg.benefitValue)}</strong></div><div className="pay"><span>Precio a pagar</span><strong>{money(pkg.finalPrice)}</strong></div><div><span>Ahorro</span><strong>{money(pkg.savings)}</strong></div></div>
 <p>{pkg.explanation}{pkg.difference!==undefined && <> · Diferencia objetivo: {money(pkg.difference)}</>}</p><button className="whatsapp" onClick={copy}>COPIAR PROMOCIÓN</button>
 </article> }

export default function App(){
 const [catalog,setCatalog]=useState<Product[]>(demo),[status,setStatus]=useState('demo'),[updated,setUpdated]=useState<Date|null>(null),[error,setError]=useState('');
 const [A,setA]=useState<Product|null>(null),[B,setB]=useState<Product|null>(null),[C,setC]=useState<Product|null>(null),[packages,setPackages]=useState<PackageResult[]|null>(null),[loading,setLoading]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setStatus('loading');setError('');try{const next=await fetchCatalog();setCatalog(next);setUpdated(new Date());setStatus('ok');setPackages(null); if(A&& !next.some(p=>p.id===A.id))setA(null); if(B&& !next.some(p=>p.id===B.id))setB(null); if(C&& !next.some(p=>p.id===C.id))setC(null);}catch(e){setStatus('error');setError(e instanceof Error?e.message:'No se pudo actualizar el catálogo.');}finally{setLoading(false)}},[A,B,C]);
 useEffect(()=>{load(); const id=window.setInterval(load,CATALOG_REFRESH_INTERVAL); return()=>window.clearInterval(id)},[load]);
 const calculate=()=>{if(!A||!B||!C)return; setPackages(buildPackages([A,B,C],catalog))};
 const total=[A,B,C].filter(Boolean).reduce((s,p)=>s+(p?.price??0),0);
 return <main><header><div><span className="brand-mark">AP</span><div><h1>AUTOMATIZADOR DE PROMOCIONES</h1><p>Motor de propuestas comerciales · catálogo en tiempo real</p></div></div><button className="refresh" onClick={load} disabled={loading}>↻ {loading?'ACTUALIZANDO...':'ACTUALIZAR CATÁLOGO'}</button></header>
 <section className="statusbar"><span className={`dot ${status}`}></span>{status==='loading'?'Actualizando catálogo...':status==='error'?'No se pudo actualizar el catálogo.':updated?`Catálogo actualizado: ${updated.toLocaleTimeString('es-MX')}`:'Catálogo de demostración'}{error&&<em>{error} {status==='error'&&catalog.length?'Mostrando último catálogo disponible.':''}</em>}</section>
 <section className="hero"><div><span className="eyebrow">PROPUESTA COMERCIAL</span><h2>Encuentra la mejor promoción para cada cliente.</h2><p>Selecciona sus tres favoritos. El motor genera, valida, puntúa y ordena las combinaciones comerciales permitidas.</p></div><div className="rule-card"><span>REGLAS ACTIVAS</span><strong>50% &gt; $25,000</strong><small>Regalos entre 20% y 30% del precio total de la base.</small></div></section>
 <section className="selection"><div className="section-title"><div><span className="eyebrow">01 · SELECCIÓN</span><h2>Selección del cliente</h2></div><div className="catalog-count">{catalog.length} productos</div></div>
 <div className="selectors"><SearchSelect label="PRODUCTO 1" help="El que más le gusta al cliente." products={catalog} value={A} onChange={setA} exclude={[B,C].filter(Boolean) as Product[]} /><SearchSelect label="PRODUCTO 2" help="Segundo favorito." products={catalog} value={B} onChange={setB} exclude={[A,C].filter(Boolean) as Product[]} /><SearchSelect label="PRODUCTO 3" help="Tercer favorito." products={catalog} value={C} onChange={setC} exclude={[A,B].filter(Boolean) as Product[]} /></div>
 <div className="summary"><div><span>SELECCIÓN DEL CLIENTE</span>{A&&<b>Producto 1 — {money(A.price)}</b>}{B&&<b>Producto 2 — {money(B.price)}</b>}{C&&<b>Producto 3 — {money(C.price)}</b>}</div><div className="total"><span>TOTAL</span><strong>{money(total)}</strong></div></div>
 <button className="calculate" disabled={!A||!B||!C} onClick={calculate}>CALCULAR PROMOCIONES <span>→</span></button></section>
 {packages&&<section className="results-section"><div className="section-title"><div><span className="eyebrow">02 · MOTOR</span><h2>Mejores propuestas</h2></div><span className="validated">✓ Generadas y validadas</span></div><div className="packages">{packages.map(p=><PackageCard key={p.rank} pkg={p}/>)}</div></section>}
 <footer>Los cálculos usan el precio total/completo vigente del catálogo. Los resultados anteriores se invalidan al actualizar el catálogo.</footer>
 </main>
}
