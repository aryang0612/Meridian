// Chart of Accounts data for all Canadian provinces/territories
export interface ChartAccount {
  code: string;
  name: string;
  type: string;
  taxCode: string;
  description: string;
}

// Dynamic import function to avoid circular imports
export const getChartOfAccounts = async (): Promise<Record<string, ChartAccount[]>> => {
  const [
    { AB_ACCOUNTS },
    { BC_ACCOUNTS },
    { MB_ACCOUNTS },
    { NB_ACCOUNTS },
    { NL_ACCOUNTS },
    { NS_ACCOUNTS },
    { NU_ACCOUNTS },
    { NT_ACCOUNTS },
    { ON_ACCOUNTS },
    { PE_ACCOUNTS },
    { QC_ACCOUNTS },
    { SK_ACCOUNTS },
    { YT_ACCOUNTS },
  ] = await Promise.all([
    import('./alberta'),
    import('./britishColumbia'),
    import('./manitoba'),
    import('./newBrunswick'),
    import('./newfoundlandLabrador'),
    import('./novaScotia'),
    import('./nunavut'),
    import('./northwestTerritories'),
    import('./ontario'),
    import('./princeEdwardIsland'),
    import('./quebec'),
    import('./saskatchewan'),
    import('./yukon'),
  ]);

  return {
    AB: AB_ACCOUNTS,
    BC: BC_ACCOUNTS,
    MB: MB_ACCOUNTS,
    NB: NB_ACCOUNTS,
    NL: NL_ACCOUNTS,
    NS: NS_ACCOUNTS,
    NU: NU_ACCOUNTS,
    NT: NT_ACCOUNTS,
    ON: ON_ACCOUNTS,
    PE: PE_ACCOUNTS,
    QC: QC_ACCOUNTS,
    SK: SK_ACCOUNTS,
    YT: YT_ACCOUNTS,
  };
};

// Export all provinces for easy access
export const SUPPORTED_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NU', 'NT', 'ON', 'PE', 'QC', 'SK', 'YT'];

// Helper function to get accounts for a province
export const getAccountsForProvince = async (province: string): Promise<ChartAccount[]> => {
  const accounts = await getChartOfAccounts();
  return accounts[province] || accounts['ON'];
};

// Helper function to validate province code
export const isValidProvince = (province: string): boolean => {
  return SUPPORTED_PROVINCES.includes(province.toUpperCase());
}; 