import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { Address, Competitor, Amenity, UserSettings, DataContextType } from "../types";
import { db, firebaseReady, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  writeBatch, 
  onSnapshot 
} from "firebase/firestore";

const DEFAULT_AMENITIES = [
  { id: "amenity_bbq", label: "BBQ", order: 1 },
  { id: "amenity_parking", label: "Parking", order: 2 },
  { id: "amenity_wifi", label: "WiFi", order: 3 },
  { id: "amenity_swimming_pool", label: "Swimming pool", order: 4 },
  { id: "amenity_garden", label: "Garden", order: 5 },
  { id: "amenity_dogs_allowed", label: "Dogs allowed", order: 6 },
  { id: "amenity_ac", label: "AC", order: 7 },
  { id: "amenity_heating", label: "Heating", order: 8 },
  { id: "amenity_tv", label: "TV", order: 9 },
  { id: "amenity_breakfast", label: "Breakfast", order: 10 },
  { id: "amenity_soap", label: "Soap", order: 11 },
  { id: "amenity_cleaning_included", label: "Cleaning included", order: 12 },
];

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    theme: "light",
    selectedAddressId: null
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Apply dark mode theme immediately when settings.theme changes
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme]);

  // Synchronize data depending on whether we are in Firebase or Local mode
  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setCompetitors([]);
      setAmenities([]);
      setSettings({ theme: "light", selectedAddressId: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    const uid = user.uid;

    if (firebaseReady && db) {
      // Firebase Firestore Integration with real-time sync
      const addrPath = `users/${uid}/addresses`;
      const compPath = `users/${uid}/competitors`;
      const amenPath = `users/${uid}/amenities`;
      const settPath = `users/${uid}/settings`;

      // 1. Subscribe to Amenities
      const unsubAmenities = onSnapshot(collection(db, amenPath), async (snapshot) => {
        let list: Amenity[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Amenity);
        });
        
        // Seed if empty
        if (list.length === 0) {
          try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();
            DEFAULT_AMENITIES.forEach((am) => {
              const amRef = doc(db!, `${amenPath}/${am.id}`);
              batch.set(amRef, {
                label: am.label,
                order: am.order,
                createdAt: now,
                updatedAt: now
              });
            });
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, amenPath);
          }
        } else {
          // Check if any default amenities are missing, and backfill if necessary
          const missing = DEFAULT_AMENITIES.filter((defAm) => !list.some((am) => am.id === defAm.id));
          if (missing.length > 0) {
            try {
              const batch = writeBatch(db);
              const now = new Date().toISOString();
              missing.forEach((am) => {
                const amRef = doc(db!, `${amenPath}/${am.id}`);
                batch.set(amRef, {
                  label: am.label,
                  order: am.order,
                  createdAt: now,
                  updatedAt: now
                });
              });
              batch.commit(); // Background write, will trigger snapshot when written
            } catch (err) {
              console.error("Failed to backfill default amenities:", err);
            }
          }

          // Sort by order then label
          list.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.label.localeCompare(b.label);
          });
          setAmenities(list);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, amenPath);
      });

      // 2. Subscribe to Addresses
      const unsubAddresses = onSnapshot(collection(db, addrPath), (snapshot) => {
        const list: Address[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Address);
        });
        setAddresses(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, addrPath);
      });

      // 3. Subscribe to Competitors
      const unsubCompetitors = onSnapshot(collection(db, compPath), (snapshot) => {
        const list: Competitor[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({ 
            id: docSnap.id, 
            platform: "Airbnb", // default
            ...data 
          } as Competitor);
        });
        setCompetitors(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, compPath);
      });

      // 4. Subscribe to Settings
      const unsubSettings = onSnapshot(doc(db, settPath, "main"), (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as UserSettings);
        } else {
          // Create initial settings
          const initial: UserSettings = { theme: "light", selectedAddressId: null };
          setDoc(doc(db!, settPath, "main"), initial).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `${settPath}/main`);
          });
          setSettings(initial);
        }
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `${settPath}/main`);
      });

      return () => {
        unsubAmenities();
        unsubAddresses();
        unsubCompetitors();
        unsubSettings();
      };
    } else {
      // Local Storage Fallback
      const addrKey = `airpricer_addresses_${uid}`;
      const compKey = `airpricer_competitors_${uid}`;
      const amenKey = `airpricer_amenities_${uid}`;
      const settKey = `airpricer_settings_${uid}`;

      // Initialize/Load Amenities
      let storedAmenities: Amenity[] = [];
      const cachedAmen = localStorage.getItem(amenKey);
      if (cachedAmen) {
        try {
          storedAmenities = JSON.parse(cachedAmen);
        } catch {
          storedAmenities = [];
        }
      }
      if (storedAmenities.length === 0) {
        const now = new Date().toISOString();
        storedAmenities = DEFAULT_AMENITIES.map((am) => ({
          id: am.id,
          label: am.label,
          order: am.order,
          createdAt: now,
          updatedAt: now
        }));
        localStorage.setItem(amenKey, JSON.stringify(storedAmenities));
      } else {
        // Backfill any missing default amenities in local storage
        const missingLocal = DEFAULT_AMENITIES.filter((defAm) => !storedAmenities.some((am) => am.id === defAm.id));
        if (missingLocal.length > 0) {
          const now = new Date().toISOString();
          const backfilled = missingLocal.map((am) => ({
            id: am.id,
            label: am.label,
            order: am.order,
            createdAt: now,
            updatedAt: now
          }));
          storedAmenities = [...storedAmenities, ...backfilled];
          // Sort them to preserve order
          storedAmenities.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.label.localeCompare(b.label);
          });
          localStorage.setItem(amenKey, JSON.stringify(storedAmenities));
        }
      }
      setAmenities(storedAmenities);

      // Load Addresses
      const cachedAddr = localStorage.getItem(addrKey);
      const storedAddresses: Address[] = cachedAddr ? JSON.parse(cachedAddr) : [];
      setAddresses(storedAddresses);

      // Load Competitors
      const cachedComp = localStorage.getItem(compKey);
      let storedCompetitors: Competitor[] = cachedComp ? JSON.parse(cachedComp) : [];
      storedCompetitors = storedCompetitors.map(c => ({
        ...c,
        platform: c.platform || "Airbnb"
      }));
      setCompetitors(storedCompetitors);

      // Load Settings
      const cachedSett = localStorage.getItem(settKey);
      let storedSettings: UserSettings = { theme: "light", selectedAddressId: null };
      if (cachedSett) {
        try {
          storedSettings = JSON.parse(cachedSett);
        } catch {
          storedSettings = { theme: "light", selectedAddressId: null };
        }
      } else {
        localStorage.setItem(settKey, JSON.stringify(storedSettings));
      }
      setSettings(storedSettings);
      setLoading(false);
    }
  }, [user]);

  // Help safely update local storage in local dev mode
  const saveLocalData = (key: string, data: any) => {
    if (!user) return;
    localStorage.setItem(`${key}_${user.uid}`, JSON.stringify(data));
  };

  // Address Operations
  const addAddress = async (addrData: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;
    const now = new Date().toISOString();
    const id = "address_" + Math.random().toString(36).substr(2, 9);
    const newAddr: Address = {
      id,
      ...addrData,
      createdAt: now,
      updatedAt: now
    };

    if (firebaseReady && db) {
      try {
        const addrRef = doc(db, `users/${uid}/addresses`, id);
        await setDoc(addrRef, newAddr);
        
        // If first address, auto-select it
        if (addresses.length === 0) {
          await selectAddress(id);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/addresses/${id}`);
      }
    } else {
      const updated = [...addresses, newAddr];
      setAddresses(updated);
      saveLocalData("airpricer_addresses", updated);

      if (addresses.length === 0 || !settings.selectedAddressId) {
        await selectAddress(id);
      }
    }
    return newAddr;
  };

  const updateAddress = async (id: string, addrData: Partial<Address>): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;
    const now = new Date().toISOString();

    if (firebaseReady && db) {
      try {
        const addrRef = doc(db, `users/${uid}/addresses`, id);
        await setDoc(addrRef, { ...addrData, updatedAt: now }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/addresses/${id}`);
      }
    } else {
      const updated = addresses.map((a) => {
        if (a.id === id) {
          return { ...a, ...addrData, updatedAt: now };
        }
        return a;
      });
      setAddresses(updated);
      saveLocalData("airpricer_addresses", updated);
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        // Delete address document
        await deleteDoc(doc(db, `users/${uid}/addresses`, id));
        
        // Consistent delete: Delete attached competitors in background or immediately
        const compList = competitors.filter((c) => c.addressId === id);
        for (const c of compList) {
          await deleteDoc(doc(db, `users/${uid}/competitors`, c.id));
        }

        // Safe address selection update
        if (settings.selectedAddressId === id) {
          const remaining = addresses.filter((a) => a.id !== id);
          const nextSelected = remaining.length > 0 ? remaining[0].id : null;
          await selectAddress(nextSelected);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/addresses/${id}`);
      }
    } else {
      // Delete from local memory
      const updatedAddr = addresses.filter((a) => a.id !== id);
      setAddresses(updatedAddr);
      saveLocalData("airpricer_addresses", updatedAddr);

      const updatedComp = competitors.filter((c) => c.addressId !== id);
      setCompetitors(updatedComp);
      saveLocalData("airpricer_competitors", updatedComp);

      if (settings.selectedAddressId === id) {
        const nextSelected = updatedAddr.length > 0 ? updatedAddr[0].id : null;
        await selectAddress(nextSelected);
      }
    }
  };

  const selectAddress = async (id: string | null): Promise<void> => {
    if (!user) return;
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        const settRef = doc(db, `users/${uid}/settings`, "main");
        await setDoc(settRef, { selectedAddressId: id }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/main`);
      }
    } else {
      const updated = { ...settings, selectedAddressId: id };
      setSettings(updated);
      saveLocalData("airpricer_settings", updated);
    }
  };

  // Competitor Operations
  const addCompetitor = async (compData: Omit<Competitor, "id" | "createdAt" | "updatedAt">): Promise<Competitor> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;
    const now = new Date().toISOString();
    const id = "competitor_" + Math.random().toString(36).substr(2, 9);
    
    // Safety check fields
    const price = Math.max(0, compData.pricePerNight || 0);
    const beds = Math.max(1, compData.bedCount || 1);
    const surface = compData.surfaceM2 !== undefined && compData.surfaceM2 !== null ? Math.max(1, compData.surfaceM2) : undefined;
    const dist = compData.distanceKm !== undefined && compData.distanceKm !== null ? Math.max(0, compData.distanceKm) : undefined;

    const newComp: Competitor = {
      id,
      addressId: compData.addressId,
      name: compData.name || "Unnamed Competitor",
      pricePerNight: price,
      bedCount: beds,
      amenities: compData.amenities || [],
      createdAt: now,
      updatedAt: now
    };

    if (surface !== undefined) newComp.surfaceM2 = surface;
    if (dist !== undefined) newComp.distanceKm = dist;

    if (firebaseReady && db) {
      try {
        const compRef = doc(db, `users/${uid}/competitors`, id);
        await setDoc(compRef, newComp);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/competitors/${id}`);
      }
    } else {
      const updated = [...competitors, newComp];
      setCompetitors(updated);
      saveLocalData("airpricer_competitors", updated);
    }
    return newComp;
  };

  const updateCompetitor = async (id: string, compData: Partial<Competitor>): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;
    const now = new Date().toISOString();

    // Guard negative/invalid values
    const cleanData: Partial<Competitor> = { ...compData };
    if (compData.pricePerNight !== undefined) cleanData.pricePerNight = Math.max(0, compData.pricePerNight);
    if (compData.bedCount !== undefined) cleanData.bedCount = Math.max(1, compData.bedCount);
    
    if (compData.surfaceM2 !== undefined) {
      if (compData.surfaceM2 === null) {
        cleanData.surfaceM2 = null as any;
      } else {
        cleanData.surfaceM2 = Math.max(1, compData.surfaceM2);
      }
    }
    
    if (compData.distanceKm !== undefined) {
      if (compData.distanceKm === null) {
        cleanData.distanceKm = null as any;
      } else {
        cleanData.distanceKm = Math.max(0, compData.distanceKm);
      }
    }

    if (firebaseReady && db) {
      try {
        const compRef = doc(db, `users/${uid}/competitors`, id);
        await setDoc(compRef, { ...cleanData, updatedAt: now }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/competitors/${id}`);
      }
    } else {
      const updated = competitors.map((c) => {
        if (c.id === id) {
          return { ...c, ...cleanData, updatedAt: now };
        }
        return c;
      });
      setCompetitors(updated);
      saveLocalData("airpricer_competitors", updated);
    }
  };

  const deleteCompetitor = async (id: string): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        await deleteDoc(doc(db, `users/${uid}/competitors`, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/competitors/${id}`);
      }
    } else {
      const updated = competitors.filter((c) => c.id !== id);
      setCompetitors(updated);
      saveLocalData("airpricer_competitors", updated);
    }
  };

  // Amenity Operations
  const addAmenity = async (label: string): Promise<Amenity> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;
    
    // Duplicate label check (case-insensitive)
    const normalized = label.trim().toLowerCase();
    if (amenities.some((a) => a.label.trim().toLowerCase() === normalized)) {
      throw new Error("Amenity already exists with this label (case-insensitive)");
    }

    const now = new Date().toISOString();
    const id = "amenity_user_" + Math.random().toString(36).substr(2, 9);
    
    // Find next order
    const maxOrder = amenities.reduce((max, a) => Math.max(max, a.order), 0);
    const nextOrder = maxOrder + 1;

    const newAmenity: Amenity = {
      id,
      label: label.trim(),
      order: nextOrder,
      createdAt: now,
      updatedAt: now
    };

    if (firebaseReady && db) {
      try {
        const amenRef = doc(db, `users/${uid}/amenities`, id);
        await setDoc(amenRef, newAmenity);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/amenities/${id}`);
      }
    } else {
      const updated = [...amenities, newAmenity];
      // Sort by order then label
      updated.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(b.label);
      });
      setAmenities(updated);
      saveLocalData("airpricer_amenities", updated);
    }
    return newAmenity;
  };

  const updateAmenity = async (id: string, label: string): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;

    // Duplicate label check (case-insensitive, exclude self)
    const normalized = label.trim().toLowerCase();
    if (amenities.some((a) => a.id !== id && a.label.trim().toLowerCase() === normalized)) {
      throw new Error("Another amenity already exists with this label");
    }

    const now = new Date().toISOString();

    if (firebaseReady && db) {
      try {
        const amenRef = doc(db, `users/${uid}/amenities`, id);
        await setDoc(amenRef, { label: label.trim(), updatedAt: now }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/amenities/${id}`);
      }
    } else {
      const updated = amenities.map((a) => {
        if (a.id === id) {
          return { ...a, label: label.trim(), updatedAt: now };
        }
        return a;
      });
      setAmenities(updated);
      saveLocalData("airpricer_amenities", updated);
    }
  };

  const deleteAmenity = async (id: string): Promise<void> => {
    if (!user) throw new Error("Unauthenticated");
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        await deleteDoc(doc(db, `users/${uid}/amenities`, id));
        
        // Gracefully remove deleted amenity from any competitor referencing it
        const affectedComps = competitors.filter((c) => c.amenities.includes(id));
        for (const c of affectedComps) {
          const nextAmen = c.amenities.filter((aId) => aId !== id);
          await setDoc(doc(db, `users/${uid}/competitors`, c.id), { amenities: nextAmen }, { merge: true });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/amenities/${id}`);
      }
    } else {
      const updated = amenities.filter((a) => a.id !== id);
      setAmenities(updated);
      saveLocalData("airpricer_amenities", updated);

      // Clean reference in competitors locally
      const updatedComps = competitors.map((c) => {
        if (c.amenities.includes(id)) {
          return { ...c, amenities: c.amenities.filter((aId) => aId !== id) };
        }
        return c;
      });
      setCompetitors(updatedComps);
      saveLocalData("airpricer_competitors", updatedComps);
    }
  };

  // Settings theme operation
  const updateTheme = async (theme: "light" | "dark"): Promise<void> => {
    if (!user) return;
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        const settRef = doc(db, `users/${uid}/settings`, "main");
        await setDoc(settRef, { theme }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/main`);
      }
    } else {
      const updated = { ...settings, theme };
      setSettings(updated);
      saveLocalData("airpricer_settings", updated);
    }
  };

  // Reset Data Operations
  const clearHistory = async (): Promise<void> => {
    if (!user) return;
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        // Delete all competitors
        for (const c of competitors) {
          await deleteDoc(doc(db, `users/${uid}/competitors`, c.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/competitors`);
      }
    } else {
      setCompetitors([]);
      saveLocalData("airpricer_competitors", []);
    }
  };

  const resetAll = async (): Promise<void> => {
    if (!user) return;
    const uid = user.uid;

    if (firebaseReady && db) {
      try {
        // 1. Delete all competitors
        for (const c of competitors) {
          await deleteDoc(doc(db, `users/${uid}/competitors`, c.id));
        }
        // 2. Delete all addresses
        for (const a of addresses) {
          await deleteDoc(doc(db, `users/${uid}/addresses`, a.id));
        }
        // 3. Delete all amenities
        for (const am of amenities) {
          await deleteDoc(doc(db, `users/${uid}/amenities`, am.id));
        }
        // 4. Reset Settings
        await setDoc(doc(db, `users/${uid}/settings`, "main"), { theme: "light", selectedAddressId: null });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    } else {
      // Clean everything from local storage
      setCompetitors([]);
      setAddresses([]);
      setAmenities([]);
      setSettings({ theme: "light", selectedAddressId: null });
      
      localStorage.removeItem(`airpricer_addresses_${uid}`);
      localStorage.removeItem(`airpricer_competitors_${uid}`);
      localStorage.removeItem(`airpricer_amenities_${uid}`);
      localStorage.removeItem(`airpricer_settings_${uid}`);
    }
  };

  return (
    <DataContext.Provider value={{
      addresses,
      competitors,
      amenities,
      settings,
      loading,
      addAddress,
      updateAddress,
      deleteAddress,
      selectAddress,
      addCompetitor,
      updateCompetitor,
      deleteCompetitor,
      addAmenity,
      updateAmenity,
      deleteAmenity,
      updateTheme,
      clearHistory,
      resetAll
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
