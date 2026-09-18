export interface SiteConfig {
  ownerName: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  siteName: string;
  siteUrl: string;
}

export const siteConfig: SiteConfig = {
  ownerName: 'Piyush Tiwari',
  address: 'Pfeilgasse 1a/291', // CHECK FORMAT
  postalCode: '1080',
  city: 'Wien',
  country: 'Austria',
  email: 'hello@moneyinaustria.at',
  siteName: 'Money in Austria',
  siteUrl: 'https://moneyinaustria.at',
};
