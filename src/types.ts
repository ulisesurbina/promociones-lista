export type Product = {
  id: string; sku?: string; name: string; price: number; priceType?: string;
  isFullPrice: boolean; category?: string; eligible?: boolean;
};

export type PromotionKind = '50%' | 'SIN_COSTO_MAS';
export type PromotionCandidate = {
  id: string; kind: PromotionKind; purchased: Product[]; benefitProducts: Product[];
  discountRate: number; baseAmount: number; benefitValue: number; finalPrice: number;
  savings: number; description: string; valid: boolean; validationErrors: string[];
  structure: string; distanceToTarget?: number; score?: number;
};

export type PackageResult = {
  rank: 1|2|3; title: string; purchased: Product[]; benefitProducts: Product[];
  normalPrice: number; benefitValue: number; finalPrice: number; savings: number;
  difference?: number; promotion: PromotionCandidate | null; explanation: string;
};
