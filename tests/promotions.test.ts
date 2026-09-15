import { describe, expect, it } from 'vitest';
import { buildPackages, findValidGifts, generatePromotionCandidates, validatePromotion } from '../src/engine/promotions';
import type { Product } from '../src/types';
const p=(id:string,price:number,full=true):Product=>({id,name:id,price,isFullPrice:full,eligible:true});

describe('reglas de promoción',()=>{
 it('$24,999 y $25,000 no califican; $25,001 sí',()=>{
  expect(generatePromotionCandidates([p('A',24999),p('B',0),p('C',0)],[]).some(x=>x.kind==='50%')).toBe(false);
  expect(generatePromotionCandidates([p('A',25000),p('B',0),p('C',0)],[]).some(x=>x.kind==='50%')).toBe(false);
  expect(generatePromotionCandidates([p('A',25001),p('B',0),p('C',0)],[]).some(x=>x.kind==='50%')).toBe(true);
 });
 it('A+B y A+B+C califican sobre el umbral',()=>{
  const r=generatePromotionCandidates([p('A',10000),p('B',16000),p('C',1)],[]).filter(x=>x.kind==='50%');
  expect(r.some(x=>x.purchased.length===2)).toBe(true);
  const r2=generatePromotionCandidates([p('A',9000),p('B',9000),p('C',8001)],[]).filter(x=>x.kind==='50%');
  expect(r2.some(x=>x.purchased.length===3)).toBe(true);
 });
 it('regalos 20%-30% y exclusión de base',()=>{
  const A=p('A',50000),G20=p('G20',10000),G30=p('G30',15000),low=p('LOW',9999),high=p('HIGH',15001);
  const gifts=findValidGifts(50000,[A,G20,G30,low,high],[A]);
  expect(gifts.map(x=>x.id)).toEqual(['G30','G20']);
 });
 it('A→A y A+B→A son inválidos; A+B→C válido',()=>{
  const A=p('A',20000),B=p('B',10000),C=p('C',12000);
  const bad={id:'x',kind:'SIN_COSTO_MAS' as const,purchased:[A],benefitProducts:[A],discountRate:0,baseAmount:20000,benefitValue:5000,finalPrice:20000,savings:5000,description:'',valid:true,validationErrors:[],structure:'A→A'};
  expect(validatePromotion(bad)).toBe(false);
  const bad2={...bad,id:'y',purchased:[A,B],benefitProducts:[A],baseAmount:30000,structure:'A+B→A'};
  expect(validatePromotion(bad2)).toBe(false);
  const good={...bad,id:'z',purchased:[A,B],benefitProducts:[C],baseAmount:30000,benefitValue:12000,structure:'A+B→C'};
  expect(validatePromotion(good)).toBe(true);
 });
 it('Paquete 2 no es B+C y Paquete 3 siempre A',()=>{
  const A=p('A',30000),B=p('B',20000),C=p('C',10000),D=p('D',12000);
  const [one,two,three]=buildPackages([A,B,C],[A,B,C,D]);
  expect(one.purchased.map(x=>x.id)).toEqual(['A','B','C']);
  expect(two.purchased[0].id).toBe('A');
  expect(three.purchased).toHaveLength(1); expect(three.purchased[0].id).toBe('A');
 });
 it('catálogo alternativo puede aportar regalos y ningún regalo válido no crea regalo',()=>{
  const A=p('A',30000),B=p('B',1000),C=p('C',1000),G=p('G',7500);
  expect(generatePromotionCandidates([A,B,C],[A,B,C,G]).some(x=>x.benefitProducts.some(g=>g.id==='G'))).toBe(true);
  const none=generatePromotionCandidates([A,B,C],[A,B,C]); expect(none.some(x=>x.kind==='SIN_COSTO_MAS')).toBe(false);
 });
});
