export type PortfolioCategory =
  | 'Automatisation'
  | 'Vidéo'
  | 'Réseaux sociaux'
  | 'Graphisme'
  | 'Identité / Branding'
  | 'Ads';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  categories: PortfolioCategory[];
  category?: string; // Legacy field, kept for backward compatibility
  coverImage?: {
    url: string;
    hint: string;
  };
  imageUrl?: string; // Legacy field, kept for backward compatibility
  coverPosition?: string;
  tags: string[];
  date: string; // ISO 8601 format
  featured: boolean;
  galleryImages?: { url: string; hint: string }[];
  sections?: any[]; // Editor sections
}
