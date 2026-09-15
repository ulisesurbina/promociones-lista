import type { Product, PromotionCandidate, PackageResult } from '../types';

export const RULES = { threshold: 25000, giftMinRate: 0.20, giftMaxRate: 0.30, targetGap: 10000, gapTolerance: 2000 } as const;
const sum = (items: Product[]) => items.reduce((n,p)=>n+p.price,0);
const full = (items: Product[]) => items.every(p=>p.isFullPrice);

export function findValidGifts(baseAmount: number, catalog: Product[], excludedProducts: Product[]): Product[] {
  const min = baseAmount * RULES.giftMinRate, max = baseAmount * RULES.giftMaxRate;
  const excluded = new Set(excludedProducts.map(p=>p.id));
  return catalog.filter(p => p.eligible !== false && !excluded.has(p.id) && p.isFullPrice && p.price >= min && p.price <= max)
    .sort((a,b)=>Math.abs(a.price-baseAmount*.3)-Math.abs(b.price-baseAmount*.3));
}

export function generatePromotionCandidates(selectedProducts: Product[], catalog: Product[]): PromotionCandidate[] {
  const candidates: PromotionCandidate[] = [];
  const subsets: Product[][] = [];
  for (let mask=1; mask<(1<<selectedProducts.length); mask++) subsets.push(selectedProducts.filter((_,i)=>(mask&(1<<i))!==0));
  for (const base of subsets) {
    if (!full(base)) continue;
    const baseAmount=sum(base);
    if (baseAmount > RULES.threshold) {
      const benefit = baseAmount * .5;
      candidates.push({id:`50-${base.map(p=>p.id).join('-')}`,kind:'50%',purchased:base,benefitProducts:[],discountRate:.5,baseAmount,benefitValue:benefit,finalPrice:baseAmount-benefit,savings:benefit,description:`50% de descuento en ${base.length === 1 ? 'el producto seleccionado' : 'la combinación seleccionada'}.`,valid:true,validationErrors:[],structure:base.map(p=>p.name).join(' + ')});
    }
    for (const gift of findValidGifts(baseAmount,catalog,base)) {
      const benefit=gift.price;
      candidates.push({id:`gift-${base.map(p=>p.id).join('-')}-${gift.id}`,kind:'SIN_COSTO_MAS',purchased:base,benefitProducts:[gift],discountRate:0,baseAmount,benefitValue:benefit,finalPrice:baseAmount,savings:benefit,description:`Sin costo más: ${gift.name}.`,valid:true,validationErrors:[],structure:`${base.map(p=>p.name).join(' + ')} → ${gift.name}`});
    }
  }
  // Explicitly enumerate the requested A/B/C directed relationships; subset generation above covers the same legal space.
  return candidates.filter(validatePromotion).map(c=>({...c,score:scorePromotion(c)}));
}

export function validatePromotion(candidate: PromotionCandidate): boolean {
  const errors:string[]=[];
  if (!candidate.purchased.length || !full(candidate.purchased)) errors.push('La base debe usar precio total/completo.');
  if (candidate.kind==='50%' && !(candidate.baseAmount>RULES.threshold)) errors.push('La base no supera $25,000.');
  if (candidate.kind==='SIN_COSTO_MAS') {
    if (!candidate.benefitProducts.length) errors.push('Falta producto beneficiado.');
    const purchasedIds=new Set(candidate.purchased.map(p=>p.id));
    if (candidate.benefitProducts.some(p=>purchasedIds.has(p.id))) errors.push('El beneficiado no puede pertenecer a la base.');
    const v=candidate.benefitValue;
    if (v < candidate.baseAmount*RULES.giftMinRate || v > candidate.baseAmount*RULES.giftMaxRate) errors.push('El regalo está fuera del rango 20%-30%.');
  }
  candidate.validationErrors=errors; candidate.valid=errors.length===0;
  return candidate.valid;
}

export function scorePromotion(candidate: PromotionCandidate): number {
  if (!candidate.valid) return -Infinity;
  const targetBonus = candidate.distanceToTarget === undefined ? 0 : Math.max(0,1000-candidate.distanceToTarget);
  const giftBonus = candidate.kind==='SIN_COSTO_MAS' ? Math.min(300,candidate.benefitValue/candidate.baseAmount*1000) : 0;
  const selectedBonus = candidate.purchased.length * 20;
  return 100000 + targetBonus + candidate.savings + giftBonus + selectedBonus;
}

function best(candidates:PromotionCandidate[], predicate:(c:PromotionCandidate)=>boolean) { return candidates.filter(predicate).sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity))[0] ?? null; }

export function buildPackages(selected:Product[],catalog:Product[]):PackageResult[] {
  const [A,B,C]=selected; const all=generatePromotionCandidates(selected,catalog);
  const p1=best(all,c=>c.purchased.length===3) || best(all,c=>c.purchased.length===3);
  const p2Base=all.filter(c=>c.purchased.length===2 && c.purchased.includes(A));
  const p2=best(p2Base, c=>true);
  const p1Price=p1?.finalPrice ?? sum(selected); const target2=p1Price-RULES.targetGap;
  if (p2) { p2.distanceToTarget=Math.abs(p2.finalPrice-target2); p2.score=scorePromotion(p2); }
  const p2Final=p2?.finalPrice ?? target2;
  const p3Base=all.filter(c=>c.purchased.length===1 && c.purchased[0].id===A.id);
  for (const c of p3Base) { c.distanceToTarget=Math.abs(c.finalPrice-(p2Final-RULES.targetGap)); c.score=scorePromotion(c); }
  const p3=best(p3Base,c=>true);
  return [
    packageFrom(1,'PAQUETE 1 · A + B + C',selected,p1,'La propuesta completa con los tres productos seleccionados.'),
    packageFrom(2,'PAQUETE 2 · A + segundo favorito',p2?.purchased ?? [A,B],p2,'Mantiene el Producto 1 y prioriza una alternativa cercana al objetivo de diferencia.'),
    packageFrom(3,'PAQUETE 3 · Producto 1',p3?.purchased ?? [A],p3,'Mantiene el Producto 1 como compra principal y busca el mejor beneficio permitido.')
  ];
}
function packageFrom(rank:1|2|3,title:string,fallbackProducts:Product[],c:PromotionCandidate|null,explanation:string):PackageResult {
  const purchased=c?.purchased ?? fallbackProducts; const normal=sum(purchased); const benefit=c?.benefitValue??0; const final=c?.finalPrice??normal; return {rank,title,purchased,benefitProducts:c?.benefitProducts??[],normalPrice:normal,benefitValue:benefit,finalPrice:final,savings:c?.savings??0,difference:c?.distanceToTarget,promotion:c,explanation};
}

export function promotionWhatsApp(pkg:PackageResult):string {
  const products=pkg.purchased.map(p=>`• ${p.name}: ${money(p.price)}`).join('\n');
  const gifts=pkg.benefitProducts.length ? `\n🎁 *Sin costo más:*\n${pkg.benefitProducts.map(p=>`• ${p.name} (${money(p.price)})`).join('\n')}` : '';
  return `*${pkg.title}*\n\n*Productos:*\n${products}${gifts}\n\nPrecio normal: *${money(pkg.normalPrice)}*\nBeneficio: *${money(pkg.benefitValue)}*\nPrecio a pagar: *${money(pkg.finalPrice)}*\nAhorro: *${money(pkg.savings)}*\n\n${pkg.explanation}`;
}
export function money(n:number){return n.toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});}
