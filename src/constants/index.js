// src/constants/index.js

// Country mapping (codes to full names)
export const COUNTRY_MAP = {
  'US': 'United States',
  'USA': 'United States',
  'NG': 'Nigeria',
  'NGA': 'Nigeria',
  'GB': 'United Kingdom',
  'UK': 'United Kingdom',
  'CA': 'Canada',
  'GH': 'Ghana',
  'KE': 'Kenya',
  'ZA': 'South Africa',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IN': 'India',
  'JP': 'Japan',
  'CN': 'China',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'CH': 'Switzerland',
  'BE': 'Belgium',
  'AT': 'Austria',
  'PT': 'Portugal',
  'IE': 'Ireland',
  'NZ': 'New Zealand',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'TR': 'Turkey',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'GR': 'Greece',
  'EG': 'Egypt',
  'MA': 'Morocco',
  'TN': 'Tunisia',
  'DZ': 'Algeria',
  'UG': 'Uganda',
  'TZ': 'Tanzania',
  'RW': 'Rwanda',
  'ET': 'Ethiopia',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  'BW': 'Botswana',
  'NA': 'Namibia',
  'MZ': 'Mozambique',
  'AO': 'Angola',
  'CM': 'Cameroon',
  'SN': 'Senegal',
  'CI': 'Côte d\'Ivoire',
  'BF': 'Burkina Faso',
  'ML': 'Mali',
  'NE': 'Niger',
  'TD': 'Chad',
  'CF': 'Central African Republic',
  'CD': 'DR Congo',
  'CG': 'Republic of the Congo',
  'GA': 'Gabon',
  'GQ': 'Equatorial Guinea',
  'BJ': 'Benin',
  'TG': 'Togo',
  'SL': 'Sierra Leone',
  'LR': 'Liberia',
  'GN': 'Guinea',
  'GW': 'Guinea-Bissau',
  'GM': 'Gambia',
  'CV': 'Cape Verde',
  'ST': 'São Tomé and Príncipe',
  'KM': 'Comoros',
  'MG': 'Madagascar',
  'MU': 'Mauritius',
  'SC': 'Seychelles',
  'DJ': 'Djibouti',
  'ER': 'Eritrea',
  'SS': 'South Sudan',
  'SD': 'Sudan',
  'LY': 'Libya',
  'MR': 'Mauritania',
  'EH': 'Western Sahara',
  'AF': 'Afghanistan',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'BT': 'Bhutan',
  'MV': 'Maldives',
  'TH': 'Thailand',
  'LA': 'Laos',
  'KH': 'Cambodia',
  'VN': 'Vietnam',
  'MM': 'Myanmar',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'BN': 'Brunei',
  'TL': 'Timor-Leste',
  'PG': 'Papua New Guinea',
  'FJ': 'Fiji',
  'SB': 'Solomon Islands',
  'VU': 'Vanuatu',
  'NC': 'New Caledonia',
  'PF': 'French Polynesia',
  'WS': 'Samoa',
  'TO': 'Tonga',
  'KI': 'Kiribati',
  'FM': 'Micronesia',
  'MH': 'Marshall Islands',
  'PW': 'Palau',
  'NR': 'Nauru',
  'TV': 'Tuvalu'
};

// Company type mapping (display to schema)
export const COMPANY_TYPE_MAP = {
  'Sole Proprietorship': 'sole_proprietor',
  'Sole Proprietor': 'sole_proprietor',
  'Partnership': 'partnership',
  'LLC': 'llc',
  'L.L.C.': 'llc',
  'Corporation': 'corporation',
  'Inc.': 'corporation',
  'NGO': 'ngo',
  'Non-Profit': 'ngo',
  'Other': 'other'
};

// Comprehensive country list for dropdowns
export const COUNTRIES = Object.entries(COUNTRY_MAP).map(([code, name]) => ({
  code,
  name
})).sort((a, b) => a.name.localeCompare(b.name));

// Industries (already matching schema)
export const INDUSTRIES = [
  { label: 'E-commerce/Marketplace', value: 'ecommerce' },
  { label: 'Real Estate', value: 'real_estate' },
  { label: 'Freelance Platform', value: 'freelance' },
  { label: 'SaaS/Software', value: 'saas' },
  { label: 'Professional Services', value: 'professional_services' },
  { label: 'Government Contracts', value: 'government' },
  { label: 'Logistics/Shipping', value: 'logistics' },
  { label: 'Finance/Fintech', value: 'finance' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Retail', value: 'retail' },
  { label: 'Technology', value: 'technology' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Services', value: 'services' },
  { label: 'Other', value: 'other' }
];

// Company types (display options)
export const COMPANY_TYPES = [
  { label: 'Sole Proprietorship', value: 'sole_proprietor' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'LLC', value: 'llc' },
  { label: 'Corporation', value: 'corporation' },
  { label: 'NGO/Non-Profit', value: 'ngo' },
  { label: 'Other', value: 'other' }
];

// Helper function to prepare user payload
export const prepareUserPayload = (formData, accountType, additionalData = {}) => {
  // Get the full country name from the code
  const countryFullName = COUNTRY_MAP[formData.country] || formData.country;
  
  const payload = {
    name: formData.name,
    email: formData.email,
    password: formData.password,
    phone: formData.phone,
    country: countryFullName,
    accountType,
    agreedToTerms: true,
    
    // Add address object with country
    address: {
      country: countryFullName
    },
    
    ...additionalData
  };

  if (accountType === 'business') {
    payload.businessInfo = {
      companyName: formData.companyName,
      companyType: formData.companyType,
      industry: formData.industry,
      registrationNumber: formData.registrationNumber || '',
      taxId: formData.taxId || '',
      // Add business address
      businessAddress: {
        country: countryFullName
      }
    };
  }

  return payload;
};
