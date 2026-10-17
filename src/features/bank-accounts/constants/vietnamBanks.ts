export interface VietnamBankItem {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  swiftBic?: string;
  isPopular?: boolean;
}

export const VIETNAM_BANKS: VietnamBankItem[] = [
  {
    bin: '970436',
    code: 'VCB',
    shortName: 'Vietcombank',
    name: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam',
    swiftBic: 'BFTVVNVX',
    isPopular: true,
  },
  {
    bin: '970422',
    code: 'MB',
    shortName: 'MBBank',
    name: 'Military Commercial Joint Stock Bank',
    swiftBic: 'MSBVVNVX',
    isPopular: true,
  },
  {
    bin: '970407',
    code: 'TCB',
    shortName: 'Techcombank',
    name: 'Vietnam Technological and Commercial Joint Stock Bank',
    swiftBic: 'VTCBVNVX',
    isPopular: true,
  },
  {
    bin: '970415',
    code: 'CTG',
    shortName: 'VietinBank',
    name: 'Vietnam Joint Stock Commercial Bank for Industry and Trade',
    swiftBic: 'ICBVVNVX',
    isPopular: true,
  },
  {
    bin: '970418',
    code: 'BIDV',
    shortName: 'BIDV',
    name: 'Bank for Investment and Development of Vietnam',
    swiftBic: 'BIDVVNVX',
    isPopular: true,
  },
  {
    bin: '970416',
    code: 'ACB',
    shortName: 'ACB',
    name: 'Asia Commercial Joint Stock Bank',
    swiftBic: 'ASCBVNVX',
    isPopular: true,
  },
  {
    bin: '970432',
    code: 'VPB',
    shortName: 'VPBank',
    name: 'Vietnam Prosperity Joint Stock Commercial Bank',
    swiftBic: 'VPBKVNVX',
    isPopular: true,
  },
  {
    bin: '970423',
    code: 'TPB',
    shortName: 'TPBank',
    name: 'Tien Phong Commercial Joint Stock Bank',
    swiftBic: 'TPBVVNVX',
    isPopular: true,
  },
  {
    bin: '970405',
    code: 'VBA',
    shortName: 'Agribank',
    name: 'Bank for Agriculture and Rural Development of Vietnam',
    swiftBic: 'VBAAVNVX',
    isPopular: true,
  },
  {
    bin: '970403',
    code: 'STB',
    shortName: 'Sacombank',
    name: 'Saigon Thuong Tin Commercial Joint Stock Bank',
    swiftBic: 'SGBKVNVX',
    isPopular: true,
  },
  {
    bin: '970437',
    code: 'HDB',
    shortName: 'HDBank',
    name: 'Ho Chi Minh City Development Joint Stock Commercial Bank',
    swiftBic: 'HDBCVNVX',
    isPopular: true,
  },
  {
    bin: '970441',
    code: 'VIB',
    shortName: 'VIB',
    name: 'Vietnam International Commercial Joint Stock Bank',
    swiftBic: 'VIBKVNVX',
    isPopular: true,
  },
  {
    bin: '970443',
    code: 'SHB',
    shortName: 'SHB',
    name: 'Saigon - Hanoi Commercial Joint Stock Bank',
    swiftBic: 'SHBAVNVX',
    isPopular: true,
  },
  {
    bin: '970448',
    code: 'OCB',
    shortName: 'OCB',
    name: 'Orient Commercial Joint Stock Bank',
    swiftBic: 'OCBCVNVX',
  },
  {
    bin: '970426',
    code: 'MSB',
    shortName: 'MSB',
    name: 'Maritime Commercial Joint Stock Bank',
    swiftBic: 'MCOBVNVX',
  },
  {
    bin: '970440',
    code: 'SEAB',
    shortName: 'SeABank',
    name: 'Southeast Asia Commercial Joint Stock Bank',
    swiftBic: 'SEABVNVX',
  },
  {
    bin: '970449',
    code: 'LPB',
    shortName: 'LPBank',
    name: 'Loc Phat Vietnam Commercial Joint Stock Bank',
    swiftBic: 'LPBVVNVX',
  },
  {
    bin: '970428',
    code: 'NAB',
    shortName: 'Nam A Bank',
    name: 'Nam A Commercial Joint Stock Bank',
    swiftBic: 'NAMAVNVX',
  },
  {
    bin: '970409',
    code: 'BAB',
    shortName: 'Bac A Bank',
    name: 'Bac A Commercial Joint Stock Bank',
    swiftBic: 'NASBVNVX',
  },
  {
    bin: '970452',
    code: 'KLB',
    shortName: 'Kienlongbank',
    name: 'Kien Long Commercial Joint Stock Bank',
    swiftBic: 'KLBVVNVX',
  },
  {
    bin: '970454',
    code: 'BVB',
    shortName: 'BVBank',
    name: 'BVBank (Viet Capital Bank)',
    swiftBic: 'GIBAVNVX',
  },
  {
    bin: '970412',
    code: 'PVCB',
    shortName: 'PVcomBank',
    name: 'PVcomBank (Vietnam Public Commercial Joint Stock Bank)',
    swiftBic: 'WBVNVNVX',
  },
  {
    bin: '970438',
    code: 'BAOVIET',
    shortName: 'BaoViet Bank',
    name: 'Bao Viet Joint Stock Commercial Bank',
    swiftBic: 'BVBKVNVX',
  },
  {
    bin: '970433',
    code: 'VIETBANK',
    shortName: 'VietBank',
    name: 'Vietbank (Vietnam Commercial Joint Stock Bank)',
    swiftBic: 'VBMTVNVX',
  },
  {
    bin: '970400',
    code: 'SGB',
    shortName: 'Saigonbank',
    name: 'Saigon Bank for Industry and Trade',
    swiftBic: 'SGICVNVX',
  },
  {
    bin: '970430',
    code: 'PGB',
    shortName: 'PGBank',
    name: 'PGBank (Prosperity and Development Commercial Joint Stock Bank)',
    swiftBic: 'PGBLVNVX',
  },
  {
    bin: '970424',
    code: 'SHBVN',
    shortName: 'Shinhan Bank',
    name: 'Shinhan Bank Vietnam Limited',
    swiftBic: 'SHBKVNVX',
  },
  {
    bin: '970457',
    code: 'WRB',
    shortName: 'Woori Bank',
    name: 'Woori Bank Vietnam Limited',
    swiftBic: 'HVBCVNVX',
  },
  {
    bin: '970434',
    code: 'IVB',
    shortName: 'Indovina Bank',
    name: 'Indovina Bank Limited',
    swiftBic: 'IABAVNVX',
  },
  {
    bin: '970439',
    code: 'PBVN',
    shortName: 'Public Bank',
    name: 'Public Bank Vietnam Limited',
    swiftBic: 'VIDPVNVX',
  },
  {
    bin: '970442',
    code: 'HLBVN',
    shortName: 'Hong Leong Bank',
    name: 'Hong Leong Bank Vietnam Limited',
    swiftBic: 'HLBBVNVX',
  },
  {
    bin: '970410',
    code: 'SCVN',
    shortName: 'Standard Chartered',
    name: 'Standard Chartered Bank (Vietnam) Limited',
    swiftBic: 'SCBLVNVX',
  },
  {
    bin: '458761',
    code: 'HSBC',
    shortName: 'HSBC Vietnam',
    name: 'HSBC Bank (Vietnam) Limited',
    swiftBic: 'HSBCVNVX',
  },
  {
    bin: '422589',
    code: 'CIMB',
    shortName: 'CIMB',
    name: 'CIMB Bank Vietnam Limited',
    swiftBic: 'CIMBVNVX',
  },
  {
    bin: '546034',
    code: 'CAKE',
    shortName: 'CAKE by VPBank',
    name: 'CAKE Digital Bank by VPBank',
  },
  {
    bin: '963388',
    code: 'TIMO',
    shortName: 'Timo',
    name: 'Timo Digital Bank by BVBank',
  },
  {
    bin: '546035',
    code: 'UBANK',
    shortName: 'Ubank by VPBank',
    name: 'Ubank Digital Bank by VPBank',
  },
  {
    bin: '971005',
    code: 'VTLMONEY',
    shortName: 'Viettel Money',
    name: 'Viettel Money (Viettel Digital Services)',
  },
  {
    bin: '971011',
    code: 'VNPTMONEY',
    shortName: 'VNPT Money',
    name: 'VNPT Money (Vietnam Posts and Telecommunications Group)',
  },
];

export function findBankByBin(bin?: string | null): VietnamBankItem | undefined {
  if (!bin) return undefined;
  return VIETNAM_BANKS.find((b) => b.bin === bin);
}

export function findBankByCodeOrName(identifier?: string | null): VietnamBankItem | undefined {
  if (!identifier) return undefined;
  const normalized = identifier.trim().toLowerCase();
  return VIETNAM_BANKS.find(
    (b) =>
      b.code.toLowerCase() === normalized ||
      b.shortName.toLowerCase() === normalized ||
      b.name.toLowerCase() === normalized ||
      b.bin === normalized,
  );
}
