export interface Province {
  code: string;
  name: string;
  taxRate: {
    gst: number;
    pst: number;
    hst: number;
    qst?: number;
  };
  taxCodes: {
    gst: string;
    pst: string;
    hst: string;
    qst?: string;
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
    code: 'MB',
    name: 'Manitoba',
    taxRate: { gst: 5, pst: 7, hst: 0 },
    taxCodes: { gst: 'GST', pst: 'PST', hst: '' }
  },
  {
    code: 'NB',
    name: 'New Brunswick',
    taxRate: { gst: 0, pst: 0, hst: 15 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  },
  {
    code: 'NL',
    name: 'Newfoundland and Labrador',
    taxRate: { gst: 0, pst: 0, hst: 15 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  },
  {
    code: 'NS',
    name: 'Nova Scotia',
    taxRate: { gst: 0, pst: 0, hst: 15 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  },
  {
    code: 'NU',
    name: 'Nunavut',
    taxRate: { gst: 5, pst: 0, hst: 0 },
    taxCodes: { gst: 'GST', pst: '', hst: '' }
  },
  {
    code: 'NT',
    name: 'Northwest Territories',
    taxRate: { gst: 5, pst: 0, hst: 0 },
    taxCodes: { gst: 'GST', pst: '', hst: '' }
  },
  {
    code: 'ON',
    name: 'Ontario',
    taxRate: { gst: 0, pst: 0, hst: 13 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  },
  {
    code: 'PE',
    name: 'Prince Edward Island',
    taxRate: { gst: 0, pst: 0, hst: 15 },
    taxCodes: { gst: '', pst: '', hst: 'HST' }
  },
  {
    code: 'QC',
    name: 'Quebec',
    taxRate: { gst: 5, pst: 0, hst: 0, qst: 9.975 },
    taxCodes: { gst: 'GST', pst: '', hst: '', qst: 'QST' }
  },
  {
    code: 'SK',
    name: 'Saskatchewan',
    taxRate: { gst: 5, pst: 6, hst: 0 },
    taxCodes: { gst: 'GST', pst: 'PST', hst: '' }
  },
  {
    code: 'YT',
    name: 'Yukon',
    taxRate: { gst: 5, pst: 0, hst: 0 },
    taxCodes: { gst: 'GST', pst: '', hst: '' }
  }
];

export const getProvinceByCode = (code: string): Province | undefined => {
  return PROVINCES.find(province => province.code === code);
};
