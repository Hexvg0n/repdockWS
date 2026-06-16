export type ShippingAgent = "BBDBUY" | "Boonbuy" | "Kakobuy" | "USfans" | "Litbuy" | "Acbuy" | "Oopbuy";

export type ShippingLine = {
  agent: ShippingAgent;
  continuedPrice: number;
  continuedWeight: number;
  fees: number;
  firstPrice: number;
  firstWeight: number;
  id: string;
  maxWeight?: number;
  minWeight?: number;
  name: string;
  routeFeature: string;
  shippingLimit: string;
  time: string;
  volumetricDivisor?: number;
};

export type PackageDimensions = {
  height?: number;
  length?: number;
  width?: number;
};

export type ShippingCalculationInput = PackageDimensions & {
  weight: number;
};

export type ShippingCalculationResult = {
  billableWeight: number;
  continuedUnits: number;
  discount: AppliedShippingDiscount | null;
  discountAmount: number;
  line: ShippingLine;
  originalPrice: number;
  price: number;
  volumeWeight: number | null;
};

export const shippingAgents: ShippingAgent[] = ["Boonbuy", "Kakobuy", "USfans", "Litbuy", "Acbuy", "Oopbuy"];
const allShippingAgents: ShippingAgent[] = ["BBDBUY", ...shippingAgents];
const cnyToUsdRate = 0.14;

export type ShippingDiscount =
  | {
      amountCny: number;
      id: string;
      label: string;
      type: "fixed";
    }
  | {
      id: string;
      label: string;
      percent: number;
      type: "percent";
    };

export type AppliedShippingDiscount = ShippingDiscount & {
  amount: number;
};

export const shippingDiscounts: Partial<Record<ShippingAgent, ShippingDiscount[]>> = {
  Acbuy: [
    {
      amountCny: 100,
      id: "acbuy-100-cny",
      label: "-100 CNY",
      type: "fixed",
    },
  ],
  BBDBUY: [
    {
      amountCny: 35,
      id: "bbdbuy-35-cny",
      label: "-35 CNY",
      type: "fixed",
    },
  ],
  Boonbuy: [
    {
      id: "boonbuy-40-percent",
      label: "-40%",
      percent: 40,
      type: "percent",
    },
  ],
  Kakobuy: [
    {
      amountCny: 100,
      id: "kakobuy-100-cny",
      label: "-100 CNY",
      type: "fixed",
    },
    {
      id: "kakobuy-20-percent",
      label: "-20%",
      percent: 20,
      type: "percent",
    },
  ],
  Litbuy: [
    {
      id: "litbuy-30-percent",
      label: "-30%",
      percent: 30,
      type: "percent",
    },
  ],
  Oopbuy: [
    {
      id: "oopbuy-20-percent",
      label: "-20%",
      percent: 20,
      type: "percent",
    },
  ],
};

export const shippingLines: ShippingLine[] = [
  {
    agent: "BBDBUY",
    continuedPrice: 1.38,
    continuedWeight: 100,
    fees: 0,
    firstPrice: 5.37,
    firstWeight: 100,
    id: "bbdbuy-polska-line",
    maxWeight: 5000,
    minWeight: 1,
    name: "POLSKA LINE",
    routeFeature: "1. Professional route, tax-inclusive transportation 2. Volume/8000cm 3. Stable timeliness, Inpost delivery",
    shippingLimit: "1 - 5000 g",
    time: "10-18 days",
    volumetricDivisor: 8000,
  },
  {
    agent: "BBDBUY",
    continuedPrice: 1.38,
    continuedWeight: 100,
    fees: 0,
    firstPrice: 10.58,
    firstWeight: 100,
    id: "bbdbuy-dhl-line",
    maxWeight: 25000,
    minWeight: 0,
    name: "DHL line",
    routeFeature: "1. Professional route, tax included delivery 2. Volume/8000cm 3. Stable timeliness, DHL delivery",
    shippingLimit: "0 - 25000 g",
    time: "7-14 days",
    volumetricDivisor: 8000,
  },
  {
    agent: "BBDBUY",
    continuedPrice: 1.3,
    continuedWeight: 100,
    fees: 0,
    firstPrice: 14.65,
    firstWeight: 100,
    id: "bbdbuy-dhl-slow-line",
    maxWeight: 25000,
    minWeight: 0,
    name: "DHL slow line",
    routeFeature: "1. Slow aging 2. Volume/8000cm 3. Delivery including tax",
    shippingLimit: "0 - 25000 g",
    time: "12-20 days",
    volumetricDivisor: 8000,
  },
  {
    agent: "BBDBUY",
    continuedPrice: 5.93,
    continuedWeight: 1000,
    fees: 0,
    firstPrice: 88.9,
    firstWeight: 15000,
    id: "bbdbuy-boat-shipping",
    maxWeight: 9999999,
    minWeight: 15000,
    name: "Boat shipping",
    routeFeature: "1. Professional line, tax included delivery 2. Shipping routes, slow timeliness",
    shippingLimit: "15000 - 9999999 g",
    time: "60-80 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 8.79,
    continuedWeight: 500,
    fees: 11.84,
    firstPrice: 8.79,
    firstWeight: 500,
    id: "kakobuy-dhl-duty-free-fast-line-j-no-battery",
    name: "DHL Duty-Free Fast Line J (No Battery)",
    routeFeature: "Express line category, 2 to 5 days faster. Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "Longest side < 120CM, second longest side < 60CM",
    time: "13-17 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 1.69,
    continuedWeight: 100,
    fees: 16.31,
    firstPrice: 8.42,
    firstWeight: 500,
    id: "kakobuy-dpd-line",
    name: "DPD Line",
    routeFeature: "Triangle transportation via Amsterdam, transferred to Poland for DPD processing.",
    shippingLimit: "L+2*(W+H)<300, L<=100",
    time: "5-12 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.01,
    continuedWeight: 500,
    fees: 10.72,
    firstPrice: 9.29,
    firstWeight: 500,
    id: "kakobuy-europe-dhl-small-parcel-economy",
    name: "Europe DHL Small Parcel (Economy)",
    routeFeature: "Economy route (cheaper but slower). Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "Longest side < 120CM, second longest side < 60CM",
    time: "13-17 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.08,
    continuedWeight: 500,
    fees: 11.84,
    firstPrice: 9.08,
    firstWeight: 500,
    id: "kakobuy-dhl-duty-free-fast-line-h-no-battery",
    name: "DHL Duty-Free Fast Line H (No Battery)",
    routeFeature: "Express line category. Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "Longest side < 120CM, second longest side < 60CM",
    time: "13-17 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.43,
    continuedWeight: 500,
    fees: 10.72,
    firstPrice: 9.43,
    firstWeight: 500,
    id: "kakobuy-dhl-europe-duty-free-route-allows-batteries",
    name: "DHL Europe Duty Free Route (allows batteries)",
    routeFeature: "Economy route. Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "Longest side < 120CM, second longest side < 60CM. Allow electrification and perfume.",
    time: "13-17 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.67,
    continuedWeight: 500,
    fees: 9.27,
    firstPrice: 9.97,
    firstWeight: 500,
    id: "kakobuy-europe-tariffless-line-k",
    maxWeight: 10000,
    name: "Europe Tariffless Line - K",
    routeFeature: "Tariffless triangular transport carried by DHL Paket via Netherlands/Belgium to Germany.",
    shippingLimit: "Max weight: 10000g. Longest edge <= 60cm, second longest <= 50cm",
    time: "7-15 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.67,
    continuedWeight: 500,
    fees: 9.44,
    firstPrice: 9.97,
    firstWeight: 500,
    id: "kakobuy-europe-dhl-line-express-line",
    name: "Europe DHL Line (Express Line)",
    routeFeature: "Exclusive delivery route. Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "L*W*H <= 60CM*50CM*50CM",
    time: "8-14 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 9.67,
    continuedWeight: 500,
    fees: 11.04,
    firstPrice: 9.97,
    firstWeight: 500,
    id: "kakobuy-dhl-duty-free-fast-line-k-no-battery",
    maxWeight: 10000,
    name: "DHL Duty-Free Fast Line K (No Battery)",
    routeFeature: "Express line category. Triangular transporting via Amsterdam to Germany.",
    shippingLimit: "Max weight: 10000g. Longest edge <= 60cm, second longest <= 50cm",
    time: "10-25 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 10.04,
    continuedWeight: 500,
    fees: 7.68,
    firstPrice: 10.04,
    firstWeight: 500,
    id: "kakobuy-europe-tariffless-line-electrified",
    maxWeight: 20000,
    name: "Europe Tariffless Line - electrified",
    routeFeature: "Tariffless triangular transport by DHL Paket via Netherlands/Belgium to Germany.",
    shippingLimit: "Max weight: 20000g. Longest edge <= 60cm. Can ship perfume, earphones, electronics.",
    time: "11-20 days",
  },
  {
    agent: "Kakobuy",
    continuedPrice: 1.89,
    continuedWeight: 100,
    fees: 16.63,
    firstPrice: 9.43,
    firstWeight: 500,
    id: "kakobuy-dpd-line-electrified",
    maxWeight: 30000,
    name: "DPD Line-electrified",
    routeFeature: "Carried by DPD via EU countries for customs clearance, transferred to destination.",
    shippingLimit: "Max weight: 30000g. Longest side <= 60cm. Allowed batteries and liquids/perfume.",
    time: "9-20 days",
  },
  {
    agent: "USfans",
    continuedPrice: 62.44,
    continuedWeight: 1000,
    fees: 51.26,
    firstPrice: 62.44,
    firstWeight: 1000,
    id: "usfans-dhl-line-in-poland",
    maxWeight: 20000,
    minWeight: 100,
    name: "DHL Line in Poland",
    routeFeature: "Dedicated line service with commercial customs clearance. Multimodal transport, no returns.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 60 && Width <= 50 && Height <= 50",
    time: "8 - 14 days",
  },
  {
    agent: "USfans",
    continuedPrice: 66.17,
    continuedWeight: 1000,
    fees: 51.26,
    firstPrice: 66.17,
    firstWeight: 1000,
    id: "usfans-polish-dhl-express",
    maxWeight: 20000,
    minWeight: 100,
    name: "Polish DHL Express",
    routeFeature: "Dedicated line service with commercial customs clearance. Fast transportation within Europe, multimodal transport, no returns.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 60 && Width <= 50 && Height <= 50",
    time: "7 - 12 days",
  },
  {
    agent: "USfans",
    continuedPrice: 72.69,
    continuedWeight: 1000,
    fees: 30.76,
    firstPrice: 72.69,
    firstWeight: 1000,
    id: "usfans-pl-in-post-pl",
    maxWeight: 5000,
    minWeight: 100,
    name: "PL in-post-PL",
    routeFeature: "Timely Delivery Guarantee. Dedicated channel with commercial customs clearance. No returns accepted.",
    shippingLimit: "Min: 100g, Max: 5000g, Length <= 60 && Width <= 40 && Height <= 35",
    time: "7 - 10 days",
  },
  {
    agent: "USfans",
    continuedPrice: 69.89,
    continuedWeight: 1000,
    fees: 51.26,
    firstPrice: 69.89,
    firstWeight: 1000,
    id: "usfans-poland-dhl-electrified",
    maxWeight: 20000,
    minWeight: 100,
    name: "Poland DHL electrified",
    routeFeature: "Dedicated line service with commercial customs clearance. Fast transportation within Europe, no returns.",
    shippingLimit: "Min: 100g, Max: 20000g, 15 < Length < 120 && 11 < Width < 50 && 1 < Height < 40 && Perimeter <= 300",
    time: "7 - 15 days",
  },
  {
    agent: "USfans",
    continuedPrice: 74.55,
    continuedWeight: 1000,
    fees: 54.98,
    firstPrice: 74.55,
    firstWeight: 1000,
    id: "usfans-poland-dhl-pure-electric",
    maxWeight: 20000,
    minWeight: 100,
    name: "Poland DHL Pure Electric",
    routeFeature: "Estimated delivery time: 7-15 business days. Volumetric weight calculation (divisor 8000). Prohibited items strictly forbidden.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 120 && Width <= 60 && Height <= 60",
    time: "7 ~ 15 days",
    volumetricDivisor: 8000,
  },
  {
    agent: "USfans",
    continuedPrice: 74.55,
    continuedWeight: 1000,
    fees: 55.92,
    firstPrice: 74.55,
    firstWeight: 1000,
    id: "usfans-poland-dhl-sensitive",
    maxWeight: 20000,
    minWeight: 100,
    name: "Poland DHL-Sensitive",
    routeFeature: "Dedicated line service with commercial customs clearance. Can transport sensitive products (electrically charged). Fast transportation within Europe, no returns.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 120 && Width <= 60 && Height <= 60 && Perimeter <= 300",
    time: "7 ~ 10 days",
  },
  {
    agent: "USfans",
    continuedPrice: 74.55,
    continuedWeight: 1000,
    fees: 64.3,
    firstPrice: 74.55,
    firstWeight: 1000,
    id: "usfans-poland-dpd-charged",
    maxWeight: 20000,
    minWeight: 100,
    name: "POLAND DPD CHARGED",
    routeFeature: "Dedicated line service with commercial customs clearance. Can ship battery-powered products via DPD. Volumetric weight divisor is 6000. No returns.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 120 && Width <= 60 && Height <= 60",
    time: "10 ~ 12 days",
    volumetricDivisor: 6000,
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.73,
    continuedWeight: 100,
    fees: 6.31,
    firstPrice: 1.73,
    firstWeight: 100,
    id: "litbuy-lit-quickly-dpd-pl",
    maxWeight: 29000,
    minWeight: 100,
    name: "LIT-Quickly-DPD-PL",
    routeFeature: "Dedicated shipping service, direct flights from China to Amsterdam, truck to Poland, DPD courier.",
    shippingLimit: "Min: 100g, Max: 29000g, Length <= 75 cm; width <= 55 cm; height <= 55 cm",
    time: "8-13 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.58,
    continuedWeight: 100,
    fees: 14.09,
    firstPrice: 3.15,
    firstWeight: 200,
    id: "litbuy-jsf-dhl-pl-1",
    maxWeight: 20000,
    minWeight: 200,
    name: "JSF-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance, fast parcel line, transport time limit 6-11 working days.",
    shippingLimit: "Min: 200g, Max: 20000g, Length <= 120 cm; width <= 60 cm; height <= 60 cm",
    time: "8-13 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.59,
    continuedWeight: 100,
    fees: 14.09,
    firstPrice: 1.59,
    firstWeight: 100,
    id: "litbuy-ssf-dhl-pl-1",
    maxWeight: 30000,
    minWeight: 0,
    name: "SSF-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance, fast parcel line, transport time limit 6-13 working days.",
    shippingLimit: "Min: 0g, Max: 30000g, Length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "8-13 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.62,
    continuedWeight: 100,
    fees: 15.48,
    firstPrice: 1.62,
    firstWeight: 100,
    id: "litbuy-xf-dhl-pl-1",
    maxWeight: 12000,
    minWeight: 100,
    name: "XF-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance, transport time limit 7-14 working days.",
    shippingLimit: "Min: 100g, Max: 12000g, Length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "10-15 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.64,
    continuedWeight: 100,
    fees: 6.31,
    firstPrice: 1.64,
    firstWeight: 100,
    id: "litbuy-stf-dpd-pl-1",
    maxWeight: 5500,
    minWeight: 100,
    name: "STF-DPD-PL-1",
    routeFeature: "Data restricted/not fully visible on screenshot.",
    shippingLimit: "Min: 100g, Max: 5500g, Length <= 75 cm; width <= 55 cm; height <= 55 cm",
    time: "8-13 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.56,
    continuedWeight: 100,
    fees: 14.09,
    firstPrice: 1.56,
    firstWeight: 100,
    id: "litbuy-sf-dhl-pl-1",
    maxWeight: 20000,
    minWeight: 100,
    name: "SF-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "10-15 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.71,
    continuedWeight: 100,
    fees: 13.54,
    firstPrice: 3.42,
    firstWeight: 200,
    id: "litbuy-jd-dhl-pl-1",
    maxWeight: 20000,
    minWeight: 200,
    name: "JD-DHL-PL-1",
    routeFeature: "Duty-free channel, commercial customs clearance. Able to carry charged products line, transport time limit 7-13 working days.",
    shippingLimit: "Min: 200g, Max: 20000g, Length <= 120 cm; width <= 60 cm; height <= 60 cm",
    time: "10-15 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 1.7,
    continuedWeight: 100,
    fees: 14.09,
    firstPrice: 1.7,
    firstWeight: 100,
    id: "litbuy-sd-dhl-pl-1",
    maxWeight: 20000,
    minWeight: 100,
    name: "SD-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance, transport time limit 7-14 working days.",
    shippingLimit: "Min: 100g, Max: 20000g, Length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "10-15 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 2.21,
    continuedWeight: 100,
    fees: 15.74,
    firstPrice: 2.21,
    firstWeight: 100,
    id: "litbuy-xb-dhl-pl-1",
    maxWeight: 30000,
    minWeight: 100,
    name: "XB-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance, transport time limit 9-20 working days.",
    shippingLimit: "Min: 100g, Max: 30000g, Shortest side <= 165 cm; L+2*(W+H) <= 300 cm",
    time: "10-15 Work Days",
  },
  {
    agent: "Litbuy",
    continuedPrice: 2.03,
    continuedWeight: 100,
    fees: 24.93,
    firstPrice: 2.03,
    firstWeight: 100,
    id: "litbuy-jd-dpdmax-pl-1",
    maxWeight: 30000,
    minWeight: 100,
    name: "JD-DPDMAX-PL-1",
    routeFeature: "Duty-free channel, commercial customs clearance. Able to carry charged products line, transport time limit 8-16 working days.",
    shippingLimit: "Min: 100g, Max: 30000g, Shortest side <= 165 cm; L+2*(W+H) <= 300 cm",
    time: "10-16 Work Days",
  },
  {
    agent: "Acbuy",
    continuedPrice: 9.67,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 15.89,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-ec-m",
    name: "Euro DHL Duty Free EC-M",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 60*40*40CM",
    time: "9-14 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 3.81,
    continuedWeight: 200,
    fees: 5.18,
    firstPrice: 15.63,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-ec-z",
    name: "Euro DHL Duty Free EC-Z",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 60*50*40CM",
    time: "10-15 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 10.28,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 13.99,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-ec-y",
    name: "Euro DHL Duty Free EC-Y",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 120*60*60CM",
    time: "12-16 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 9.84,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 16.41,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-ec-s",
    name: "Euro DHL Duty Free EC-S",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 60*50*40CM",
    time: "10-15 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 10.02,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 18.31,
    firstWeight: 500,
    id: "acbuy-dhl-duty-free-sensitive-y",
    name: "DHL Duty Free (Sensitive)-Y",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 120*60*60CM",
    time: "10-18 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 10.62,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 15.55,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-ec-pureweight",
    name: "Euro DHL Duty Free EC-PUREWEIGHT",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. Charged by the actual weight.",
    shippingLimit: "Size limit: 60*50*40CM",
    time: "12-16 working days",
  },
  {
    agent: "Acbuy",
    continuedPrice: 11.23,
    continuedWeight: 500,
    fees: 5.18,
    firstPrice: 15.72,
    firstWeight: 500,
    id: "acbuy-euro-dhl-duty-free-special-m",
    name: "Euro DHL Duty Free (Special)-M",
    routeFeature: "Tax-free air route, triangle shipping route (UK is direct route), then to Amsterdam and Germany. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 60*40*40CM",
    time: "13-17 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Acbuy",
    continuedPrice: 3.99,
    continuedWeight: 200,
    fees: 2.59,
    firstPrice: 90.71,
    firstWeight: 3000,
    id: "acbuy-dpd-large-packet-m",
    name: "DPD Large Packet-M",
    routeFeature: "Tax-free air route, triangle shipping route via Amsterdam to Germany. DPD handles the last mile. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: 120*60*60CM",
    time: "10-15 working days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 6.09,
    continuedWeight: 100,
    fees: 25.61,
    firstPrice: 6.09,
    firstWeight: 100,
    id: "boonbuy-xf-inpost-pl-pl-1",
    name: "XF-InPost (PL)-PL-1",
    routeFeature: "Duty-free parcel channel adopting commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "8-12 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 6.19,
    continuedWeight: 100,
    fees: 22.62,
    firstPrice: 6.19,
    firstWeight: 100,
    id: "boonbuy-boon-quickly-dpd-pl",
    name: "BOON-Quickly-DPD-PL",
    routeFeature: "BOON Logistics offers a dedicated shipping service with direct flights from China to Amsterdam Airport. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 75 cm; width <= 55 cm; height <= 55 cm",
    time: "7-12 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 5.89,
    continuedWeight: 100,
    fees: 22.62,
    firstPrice: 5.89,
    firstWeight: 100,
    id: "boonbuy-stf-dpd-pl-1",
    name: "STF-DPD-PL-1",
    routeFeature: "Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 75 cm; width <= 55 cm; height <= 55 cm",
    time: "8-13 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 5.69,
    continuedWeight: 100,
    fees: 50.55,
    firstPrice: 5.69,
    firstWeight: 100,
    id: "boonbuy-ssf-dhl-pl-1",
    name: "SSF-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "8-13 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 5.79,
    continuedWeight: 100,
    fees: 50.55,
    firstPrice: 11.58,
    firstWeight: 200,
    id: "boonbuy-jsf-dhl-pl-1",
    name: "JSF-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 120 cm; width <= 60 cm; height <= 60 cm",
    time: "8-13 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 5.89,
    continuedWeight: 100,
    fees: 55.54,
    firstPrice: 5.89,
    firstWeight: 100,
    id: "boonbuy-xf-dhl-pl-1",
    name: "XF-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "10-15 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 6.09,
    continuedWeight: 100,
    fees: 50.55,
    firstPrice: 6.09,
    firstWeight: 100,
    id: "boonbuy-sd-dhl-pl-1",
    name: "SD-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "10-15 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 6.14,
    continuedWeight: 100,
    fees: 48.55,
    firstPrice: 12.27,
    firstWeight: 200,
    id: "boonbuy-jd-dhl-pl-1",
    name: "JD-DHL-PL-1",
    routeFeature: "Duty-free channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 120 cm; width <= 60 cm; height <= 60 cm",
    time: "10-15 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 6.39,
    continuedWeight: 100,
    fees: 52.54,
    firstPrice: 6.39,
    firstWeight: 100,
    id: "boonbuy-zm-dhl-pl-1",
    name: "ZM-DHL-PL-1",
    routeFeature: "Tax inclusive channel, commercial clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 60 cm; width <= 50 cm; height <= 40 cm",
    time: "8-16 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Boonbuy",
    continuedPrice: 7.91,
    continuedWeight: 100,
    fees: 56.45,
    firstPrice: 7.91,
    firstWeight: 100,
    id: "boonbuy-xb-dhl-pl-1",
    name: "XB-DHL-PL-1",
    routeFeature: "Dedicated channel, commercial customs clearance. Charged by the greater of actual and volume weight (divisor 8000).",
    shippingLimit: "Size limit: length <= 45 cm; width <= 45 cm; height <= 35 cm",
    time: "10-15 Work Days",
    volumetricDivisor: 8000,
  },
  {
    agent: "Oopbuy",
    continuedPrice: 1.62,
    continuedWeight: 100,
    fees: 6.27,
    firstPrice: 16.13,
    firstWeight: 1000,
    id: "oopbuy-stf-dpd-pl-1",
    maxWeight: 20000,
    minWeight: 100,
    name: "STF-DPD-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance. Transport time limit 7-13 working days. DPD logistics timeliness is high, fast transportation within the European region.",
    shippingLimit: "Min: 100g, Max: 20000g, L<=60&&W<=50&&H<=40",
    time: "8-16 Business Day",
  },
  {
    agent: "Oopbuy",
    continuedPrice: 1.57,
    continuedWeight: 100,
    fees: 12.67,
    firstPrice: 15.62,
    firstWeight: 1000,
    id: "oopbuy-jf-dhl-pl-1",
    maxWeight: 20000,
    minWeight: 200,
    name: "JF-DHL-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance. Transport time limit 7-13 working days. DHL logistics timeliness is high, fast transportation within the European region.",
    shippingLimit: "Min: 200g, Max: 20000g, L<=120&&W<=60&&H<=60",
    time: "10-18 Business Day",
  },
  {
    agent: "Oopbuy",
    continuedPrice: 1.77,
    continuedWeight: 100,
    fees: 6.78,
    firstPrice: 17.66,
    firstWeight: 1000,
    id: "oopbuy-ztf-dpd-pl-1",
    maxWeight: 30000,
    minWeight: 1000,
    name: "ZTF-DPD-PL-1",
    routeFeature: "Tax free parcel channel, commercial customs clearance. Transport time limit 8-16 working days. Colissimo logistics timeliness is high, fast transportation within the European region.",
    shippingLimit: "Min: 1000g, Max: 30000g, L<=60&&W<=40&&H<=40",
    time: "8-16 Business Day",
  },
];

export function calculateBillableWeight(input: ShippingCalculationInput, line: ShippingLine) {
  const actualWeight = Math.max(0, input.weight);
  const volumeWeight = calculateVolumeWeight(input, line);
  const billableWeight = volumeWeight === null ? actualWeight : Math.max(actualWeight, volumeWeight);

  return Math.ceil(billableWeight);
}

export function calculateShippingLinePrice(line: ShippingLine, input: ShippingCalculationInput): ShippingCalculationResult {
  const billableWeight = calculateBillableWeight(input, line);
  const volumeWeight = calculateVolumeWeight(input, line);
  const continuedUnits =
    billableWeight > line.firstWeight
      ? Math.ceil((billableWeight - line.firstWeight) / line.continuedWeight)
      : 0;
  const originalPrice = roundMoney(line.firstPrice + continuedUnits * line.continuedPrice + line.fees);
  const discount = getBestShippingDiscount(line.agent, originalPrice);
  const discountAmount = discount?.amount ?? 0;
  const price = roundMoney(Math.max(0, originalPrice - discountAmount));

  return {
    billableWeight,
    continuedUnits,
    discount,
    discountAmount,
    line,
    originalPrice,
    price,
    volumeWeight,
  };
}

export function calculateShippingOptions(input: ShippingCalculationInput, agent?: ShippingAgent | string) {
  return getShippingLinesByAgent(agent)
    .filter((line) => isShippingLineAvailableForWeight(line, calculateBillableWeight(input, line)))
    .map((line) => calculateShippingLinePrice(line, input))
    .sort((first, second) => first.price - second.price || first.originalPrice - second.originalPrice);
}

export function getShippingLineById(id: string) {
  return shippingLines.find((line) => line.id === id) ?? null;
}

export function getShippingLinesByAgent(agent?: ShippingAgent | string) {
  if (!agent) return shippingLines.filter((line) => line.agent !== "BBDBUY");

  const normalizedAgent = normalizeAgentName(agent);
  return normalizedAgent ? shippingLines.filter((line) => line.agent === normalizedAgent) : [];
}

export function isShippingLineAvailableForWeight(line: ShippingLine, weight: number) {
  if (line.minWeight !== undefined && weight < line.minWeight) return false;
  if (line.maxWeight !== undefined && weight > line.maxWeight) return false;
  return true;
}

export function normalizeAgentName(agent: string): ShippingAgent | null {
  const normalized = agent.trim().toLowerCase();

  return allShippingAgents.find((shippingAgent) => shippingAgent.toLowerCase() === normalized) ?? null;
}

function calculateVolumeWeight(input: PackageDimensions, line: ShippingLine) {
  const { height, length, width } = input;

  if (!line.volumetricDivisor || !height || !length || !width) {
    return null;
  }

  return Math.ceil((length * width * height * 1000) / line.volumetricDivisor);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getBestShippingDiscount(agent: ShippingAgent, originalPrice: number): AppliedShippingDiscount | null {
  const discounts = shippingDiscounts[agent] ?? [];

  if (!discounts.length || originalPrice <= 0) {
    return null;
  }

  const appliedDiscounts = discounts.map((discount) => ({
    ...discount,
    amount: calculateDiscountAmount(discount, originalPrice),
  }));
  const bestDiscount = appliedDiscounts.reduce<AppliedShippingDiscount | null>(
    (best, current) => (!best || current.amount > best.amount ? current : best),
    null,
  );

  return bestDiscount && bestDiscount.amount > 0 ? bestDiscount : null;
}

function calculateDiscountAmount(discount: ShippingDiscount, originalPrice: number) {
  const rawAmount =
    discount.type === "fixed"
      ? discount.amountCny * cnyToUsdRate
      : originalPrice * (discount.percent / 100);

  return roundMoney(Math.min(originalPrice, Math.max(0, rawAmount)));
}
