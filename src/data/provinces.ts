export interface Province {
  code: string;
  name: string;
  taxRate: {
    gst: number;
    pst: number;
    hst: number;
  };
  taxCodes: {
    gst: string;
    pst: string;
    hst: string;
  };
}

export const PROVINCES: Province[] = [
  {
    code: 'AB',
    name: 'Alberta',
    taxRate: { gst: 5, pst: 0, hst: 0 },
    taxCodes: { gst: 'GST', pst: '', hst: '' }
  },
  {
    code: 'BC',
    name: 'British Columbia',
    taxRate: { gst: 5, pst: 7, hst: 0 },
    taxCodes: { gst: 'GST', pst: 'PST', hst: '' }
  },
  {
    code: 'ON',
    name: 'Ontario',
    taxRate: { gst: 0, pst: 0, hst: 13 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  }
];

export const getProvinceByCode = (code: string): Province | undefined => {
  return PROVINCES.find(province => province.code === code);
};
