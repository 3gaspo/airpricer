export interface Address {
  id: string;
  label: string;
  fullAddress: string;
  radiusKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface Competitor {
  id: string;
  addressId: string;
  name: string;
  pricePerNight: number;
  bedCount: number;
  amenities: string[]; // array of amenity IDs or labels? Use stable Amenity IDs as React keys, and store amenity IDs in competitor.amenities.
  surfaceM2?: number;
  distanceKm?: number;
  platform?: string; // e.g., "Airbnb", "Booking.com", "Other"
  comment?: string; // short comment on each competitor
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  label: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: "light" | "dark";
  selectedAddressId: string | null;
}

export interface UserProfile {
  uid: string;
  email: string | null;
}

// Data Provider Interface
export interface DataContextType {
  addresses: Address[];
  competitors: Competitor[];
  amenities: Amenity[];
  settings: UserSettings;
  loading: boolean;
  
  // Address Operations
  addAddress: (address: Omit<Address, "id" | "createdAt" | "updatedAt">) => Promise<Address>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  selectAddress: (id: string | null) => Promise<void>;
  
  // Competitor Operations
  addCompetitor: (competitor: Omit<Competitor, "id" | "createdAt" | "updatedAt">) => Promise<Competitor>;
  updateCompetitor: (id: string, competitor: Partial<Competitor>) => Promise<void>;
  deleteCompetitor: (id: string) => Promise<void>;
  
  // Amenity Operations
  addAmenity: (label: string) => Promise<Amenity>;
  updateAmenity: (id: string, label: string) => Promise<void>;
  deleteAmenity: (id: string) => Promise<void>;
  
  // Settings Operations
  updateTheme: (theme: "light" | "dark") => Promise<void>;
  
  // Reset Data Operations
  clearHistory: () => Promise<void>;
  resetAll: () => Promise<void>;
}
