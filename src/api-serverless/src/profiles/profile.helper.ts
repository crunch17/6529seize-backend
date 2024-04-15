import { ProfileClassification } from '../../../entities/IProfile';

const all_sub_classifications = <const>[
  'ReMemes',
  'PFP',
  'Generative Art',
  '1/1',
  'Photography',
  'Metaverse',
  'Gaming',
  'Arts & Culture: Studio',
  'Arts & Culture: Museum',
  'Arts & Culture: Theater',
  'Arts & Culture: Library',
  'Arts & Culture: Performing Arts',
  'Arts & Culture: Visual Arts',
  'Arts & Culture: Video Games',
  'Automotive: Manufacturing',
  'Automotive: Parts',
  'Automotive: Sales and Service',
  'Aerospace: Aircraft manufacturing',
  'Aerospace: Space Industry',
  'Aerospace: Engineering',
  'Chemicals: Industrial',
  'Chemicals: Speciality',
  'Crypto: Wallet',
  'Crypto: Exchange',
  'Crypto: DeFi',
  'Crypto: Marketplace',
  'Crypto: Infrastructure',
  'Crypto: Analytics',
  'Crypto: Mining',
  'Crypto: Staking',
  'Crypto: Blockchain',
  'Conglomerate',
  'Construction: Construction',
  'Construction: Engineering',
  'Construction: Architecture',
  'Educational: School',
  'Educational: Primary School',
  'Educational: Middle School',
  'Educational: College',
  'Educational: University',
  'Educational: Research Institute',
  'Electronics: Mobile Phones',
  'Electronics: Consumer Electronics',
  'Energy: Exploration and Production',
  'Energy: Refining',
  'Energy: Distribution',
  'Energy: Trading',
  'Energy: Integrated',
  'Energy: Utility',
  'Energy: Renewable',
  'Energy: Infrastructure',
  'Fashion: Clothing',
  'Fashion: Jewelry',
  'Fashion: Textiles',
  'Financial Services: Commercial Bank',
  'Financial Services: Asset Management',
  'Financial Services: Investment Bank',
  'Financial Services: Insurance',
  'Financial Services: Credit Unions',
  'Financial Services: Wealth Management',
  'Financial Services: FinTech',
  'Food: Agricultural',
  'Food: Animal Husbandry',
  'Food: Packaged Goods',
  'Food: Beverages',
  'Government: Local',
  'Government: State/Regional',
  'Government: National',
  'Government: International',
  'Healthcare: Clinic',
  'Healthcare: Hospital',
  'Healthcare: Pharmaceuticals',
  'Healthcare: Cosmetic',
  'Healthcare: Other',
  'Hospitality: Hotel',
  'Hospitality: Resort',
  'Hospitality: Bar',
  'Hospitality: Restaurant',
  'Hospitality: Nightclub',
  'Hospitality: Travel Agency',
  'Hospitality: Spa',
  'IT: Hardware',
  'IT: IT Services',
  'IT: Networking',
  'IT: Cybersecurity',
  'Logistics: Logistics Services',
  'Logistics: Supply Chain Management',
  'Logistics: Warehousing and Distribution',
  'Industrial: Machinery',
  'Sports: Sports Club',
  'Sports: Sports League',
  'Sports: Fitness Center',
  'Media: News Agency',
  'Media: Newspaper',
  'Media: Radio Station',
  'Media: Television',
  'Media: Film',
  'Media: Advertising',
  'Media: Music',
  'Media: Design',
  'Media: Journalism',
  'Media: Digital Media',
  'Media: Podcast',
  'Non-Profit: Charity',
  'Non-Profit: Foundation',
  'Non-Profit: Advocacy Group',
  'Real Estate: Agency',
  'Real Estate: Commercial',
  'Real Estate: Residential',
  'Religion: Church',
  'Religion: Mosque',
  'Religion: Synagogue',
  'Religion: Temple',
  'Religion: Monastery',
  'Religion: Ashram',
  'Religion: Gurdwara',
  'Religion: Pagoda',
  'Religion: Meeting House',
  'Retail: E-commerce',
  'Retail: Clothing',
  'Retail: Grocery',
  'Retail: Electronics',
  'Retail: Books',
  'Retail: Health and Beauty',
  'Retail: Toys',
  'Retail: Beauty and Grooming',
  'Retail: Speciality',
  'Services: Legal Services',
  'Services: Accounting',
  'Services: Consulting',
  'Software: Operating Systems',
  'Software: Desktop Apps',
  'Software: SaaS',
  'Software: Open-Source',
  'Software: Mobile Apps',
  'Software: AI & Machine Learning',
  'Software: Enterprise',
  'Software: Security',
  'Software: Development Tools',
  'Professional: Association',
  'Professional: Trade Union',
  'Technology: Startup',
  'Telecom: General',
  'Telecom: Network',
  'Telecom: Equipment',
  'Transportation: Rail',
  'Transportation: Air',
  'Transportation: Maritime',
  'Other'
];

export const sub_classification_to_classification: Record<
  (typeof all_sub_classifications)[number],
  ProfileClassification[]
> = {
  ReMemes: [ProfileClassification.COLLECTION],
  PFP: [ProfileClassification.COLLECTION],
  'Generative Art': [ProfileClassification.COLLECTION],
  '1/1': [ProfileClassification.COLLECTION],
  Photography: [ProfileClassification.COLLECTION],
  Metaverse: [ProfileClassification.COLLECTION],
  Gaming: [ProfileClassification.COLLECTION],
  'Arts & Culture: Studio': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Museum': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Theater': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Library': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Performing Arts': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Visual Arts': [ProfileClassification.ORGANIZATION],
  'Arts & Culture: Video Games': [ProfileClassification.ORGANIZATION],
  'Automotive: Manufacturing': [ProfileClassification.ORGANIZATION],
  'Automotive: Parts': [ProfileClassification.ORGANIZATION],
  'Automotive: Sales and Service': [ProfileClassification.ORGANIZATION],
  'Aerospace: Aircraft manufacturing': [ProfileClassification.ORGANIZATION],
  'Aerospace: Space Industry': [ProfileClassification.ORGANIZATION],
  'Aerospace: Engineering': [ProfileClassification.ORGANIZATION],
  'Chemicals: Industrial': [ProfileClassification.ORGANIZATION],
  'Chemicals: Speciality': [ProfileClassification.ORGANIZATION],
  'Crypto: Wallet': [ProfileClassification.ORGANIZATION],
  'Crypto: Exchange': [ProfileClassification.ORGANIZATION],
  'Crypto: DeFi': [ProfileClassification.ORGANIZATION],
  'Crypto: Marketplace': [ProfileClassification.ORGANIZATION],
  'Crypto: Infrastructure': [ProfileClassification.ORGANIZATION],
  'Crypto: Analytics': [ProfileClassification.ORGANIZATION],
  'Crypto: Mining': [ProfileClassification.ORGANIZATION],
  'Crypto: Staking': [ProfileClassification.ORGANIZATION],
  'Crypto: Blockchain': [ProfileClassification.ORGANIZATION],
  Conglomerate: [],
  'Construction: Construction': [ProfileClassification.ORGANIZATION],
  'Construction: Engineering': [ProfileClassification.ORGANIZATION],
  'Construction: Architecture': [ProfileClassification.ORGANIZATION],
  'Educational: School': [ProfileClassification.ORGANIZATION],
  'Educational: Primary School': [ProfileClassification.ORGANIZATION],
  'Educational: Middle School': [ProfileClassification.ORGANIZATION],
  'Educational: College': [ProfileClassification.ORGANIZATION],
  'Educational: University': [ProfileClassification.ORGANIZATION],
  'Educational: Research Institute': [ProfileClassification.ORGANIZATION],
  'Electronics: Mobile Phones': [ProfileClassification.ORGANIZATION],
  'Electronics: Consumer Electronics': [ProfileClassification.ORGANIZATION],
  'Energy: Exploration and Production': [ProfileClassification.ORGANIZATION],
  'Energy: Refining': [ProfileClassification.ORGANIZATION],
  'Energy: Distribution': [ProfileClassification.ORGANIZATION],
  'Energy: Trading': [ProfileClassification.ORGANIZATION],
  'Energy: Integrated': [ProfileClassification.ORGANIZATION],
  'Energy: Utility': [ProfileClassification.ORGANIZATION],
  'Energy: Renewable': [ProfileClassification.ORGANIZATION],
  'Energy: Infrastructure': [ProfileClassification.ORGANIZATION],
  'Fashion: Clothing': [ProfileClassification.ORGANIZATION],
  'Fashion: Jewelry': [ProfileClassification.ORGANIZATION],
  'Fashion: Textiles': [ProfileClassification.ORGANIZATION],
  'Financial Services: Commercial Bank': [ProfileClassification.ORGANIZATION],
  'Financial Services: Asset Management': [ProfileClassification.ORGANIZATION],
  'Financial Services: Investment Bank': [ProfileClassification.ORGANIZATION],
  'Financial Services: Insurance': [ProfileClassification.ORGANIZATION],
  'Financial Services: Credit Unions': [ProfileClassification.ORGANIZATION],
  'Financial Services: Wealth Management': [ProfileClassification.ORGANIZATION],
  'Financial Services: FinTech': [ProfileClassification.ORGANIZATION],
  'Food: Agricultural': [ProfileClassification.ORGANIZATION],
  'Food: Animal Husbandry': [ProfileClassification.ORGANIZATION],
  'Food: Packaged Goods': [ProfileClassification.ORGANIZATION],
  'Food: Beverages': [ProfileClassification.ORGANIZATION],
  'Government: Local': [ProfileClassification.ORGANIZATION],
  'Government: State/Regional': [ProfileClassification.ORGANIZATION],
  'Government: National': [ProfileClassification.ORGANIZATION],
  'Government: International': [ProfileClassification.ORGANIZATION],
  'Healthcare: Clinic': [ProfileClassification.ORGANIZATION],
  'Healthcare: Hospital': [ProfileClassification.ORGANIZATION],
  'Healthcare: Pharmaceuticals': [ProfileClassification.ORGANIZATION],
  'Healthcare: Cosmetic': [ProfileClassification.ORGANIZATION],
  'Healthcare: Other': [ProfileClassification.ORGANIZATION],
  'Hospitality: Hotel': [ProfileClassification.ORGANIZATION],
  'Hospitality: Resort': [ProfileClassification.ORGANIZATION],
  'Hospitality: Bar': [ProfileClassification.ORGANIZATION],
  'Hospitality: Restaurant': [ProfileClassification.ORGANIZATION],
  'Hospitality: Nightclub': [ProfileClassification.ORGANIZATION],
  'Hospitality: Travel Agency': [ProfileClassification.ORGANIZATION],
  'Hospitality: Spa': [ProfileClassification.ORGANIZATION],
  'IT: Hardware': [ProfileClassification.ORGANIZATION],
  'IT: IT Services': [ProfileClassification.ORGANIZATION],
  'IT: Networking': [ProfileClassification.ORGANIZATION],
  'IT: Cybersecurity': [ProfileClassification.ORGANIZATION],
  'Logistics: Logistics Services': [ProfileClassification.ORGANIZATION],
  'Logistics: Supply Chain Management': [ProfileClassification.ORGANIZATION],
  'Logistics: Warehousing and Distribution': [
    ProfileClassification.ORGANIZATION
  ],
  'Industrial: Machinery': [ProfileClassification.ORGANIZATION],
  'Sports: Sports Club': [ProfileClassification.ORGANIZATION],
  'Sports: Sports League': [ProfileClassification.ORGANIZATION],
  'Sports: Fitness Center': [ProfileClassification.ORGANIZATION],
  'Media: News Agency': [ProfileClassification.ORGANIZATION],
  'Media: Newspaper': [ProfileClassification.ORGANIZATION],
  'Media: Radio Station': [ProfileClassification.ORGANIZATION],
  'Media: Television': [ProfileClassification.ORGANIZATION],
  'Media: Film': [ProfileClassification.ORGANIZATION],
  'Media: Advertising': [ProfileClassification.ORGANIZATION],
  'Media: Music': [ProfileClassification.ORGANIZATION],
  'Media: Design': [ProfileClassification.ORGANIZATION],
  'Media: Journalism': [ProfileClassification.ORGANIZATION],
  'Media: Digital Media': [ProfileClassification.ORGANIZATION],
  'Media: Podcast': [ProfileClassification.ORGANIZATION],
  'Non-Profit: Charity': [ProfileClassification.ORGANIZATION],
  'Non-Profit: Foundation': [ProfileClassification.ORGANIZATION],
  'Non-Profit: Advocacy Group': [ProfileClassification.ORGANIZATION],
  'Real Estate: Agency': [ProfileClassification.ORGANIZATION],
  'Real Estate: Commercial': [ProfileClassification.ORGANIZATION],
  'Real Estate: Residential': [ProfileClassification.ORGANIZATION],
  'Religion: Church': [ProfileClassification.ORGANIZATION],
  'Religion: Mosque': [ProfileClassification.ORGANIZATION],
  'Religion: Synagogue': [ProfileClassification.ORGANIZATION],
  'Religion: Temple': [ProfileClassification.ORGANIZATION],
  'Religion: Monastery': [ProfileClassification.ORGANIZATION],
  'Religion: Ashram': [ProfileClassification.ORGANIZATION],
  'Religion: Gurdwara': [ProfileClassification.ORGANIZATION],
  'Religion: Pagoda': [ProfileClassification.ORGANIZATION],
  'Religion: Meeting House': [ProfileClassification.ORGANIZATION],
  'Retail: E-commerce': [ProfileClassification.ORGANIZATION],
  'Retail: Clothing': [ProfileClassification.ORGANIZATION],
  'Retail: Grocery': [ProfileClassification.ORGANIZATION],
  'Retail: Electronics': [ProfileClassification.ORGANIZATION],
  'Retail: Books': [ProfileClassification.ORGANIZATION],
  'Retail: Health and Beauty': [ProfileClassification.ORGANIZATION],
  'Retail: Toys': [ProfileClassification.ORGANIZATION],
  'Retail: Beauty and Grooming': [ProfileClassification.ORGANIZATION],
  'Retail: Speciality': [ProfileClassification.ORGANIZATION],
  'Services: Legal Services': [ProfileClassification.ORGANIZATION],
  'Services: Accounting': [ProfileClassification.ORGANIZATION],
  'Services: Consulting': [ProfileClassification.ORGANIZATION],
  'Software: Operating Systems': [ProfileClassification.ORGANIZATION],
  'Software: Desktop Apps': [ProfileClassification.ORGANIZATION],
  'Software: SaaS': [ProfileClassification.ORGANIZATION],
  'Software: Open-Source': [ProfileClassification.ORGANIZATION],
  'Software: Mobile Apps': [ProfileClassification.ORGANIZATION],
  'Software: AI & Machine Learning': [ProfileClassification.ORGANIZATION],
  'Software: Enterprise': [ProfileClassification.ORGANIZATION],
  'Software: Security': [ProfileClassification.ORGANIZATION],
  'Software: Development Tools': [ProfileClassification.ORGANIZATION],
  'Professional: Association': [ProfileClassification.ORGANIZATION],
  'Professional: Trade Union': [ProfileClassification.ORGANIZATION],
  'Technology: Startup': [ProfileClassification.ORGANIZATION],
  'Telecom: General': [ProfileClassification.ORGANIZATION],
  'Telecom: Network': [ProfileClassification.ORGANIZATION],
  'Telecom: Equipment': [ProfileClassification.ORGANIZATION],
  'Transportation: Rail': [ProfileClassification.ORGANIZATION],
  'Transportation: Air': [ProfileClassification.ORGANIZATION],
  'Transportation: Maritime': [ProfileClassification.ORGANIZATION],
  Other: [ProfileClassification.COLLECTION, ProfileClassification.ORGANIZATION]
};

export function getProfileClassificationsBySubclassification(
  subClassification: string
): ProfileClassification[] {
  return (
    sub_classification_to_classification[
      subClassification as (typeof all_sub_classifications)[number]
    ] ?? []
  );
}
