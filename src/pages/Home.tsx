import React, { useState, useMemo } from "react";
import { useData } from "../providers/DataProvider";
import { Competitor, Address } from "../types";
import { 
  Plus, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  MapPin, 
  Bed, 
  Expand, 
  Compass, 
  DollarSign,
  ChevronDown,
  ArrowUpDown,
  FilterX,
  X,
  Check,
  MessageSquare
} from "lucide-react";
import { Modal } from "../components/Modal";

export const Home: React.FC = () => {
  const { 
    addresses, 
    competitors, 
    amenities, 
    settings, 
    addAddress, 
    updateAddress, 
    deleteAddress, 
    selectAddress,
    addCompetitor,
    updateCompetitor,
    deleteCompetitor
  } = useData();

  // Selected Address State
  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a.id === settings.selectedAddressId) || null;
  }, [addresses, settings.selectedAddressId]);

  // Modals Visibility
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);

  const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false);
  const [competitorToEdit, setCompetitorToEdit] = useState<Competitor | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<string | null>(null);
  
  const [isAddressDeleteConfirmOpen, setIsAddressDeleteConfirmOpen] = useState(false);

  // Address Form State
  const [addrLabel, setAddrLabel] = useState("");
  const [addrFull, setAddrFull] = useState("");
  const [addrRadius, setAddrRadius] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);

  // Competitor Form State
  const [compName, setCompName] = useState("");
  const [compPrice, setCompPrice] = useState("");
  const [compBeds, setCompBeds] = useState("");
  const [compSurface, setCompSurface] = useState("");
  const [compDistance, setCompDistance] = useState("");
  const [compAmenities, setCompAmenities] = useState<string[]>([]);
  const [compPlatform, setCompPlatform] = useState("Airbnb");
  const [customPlatform, setCustomPlatform] = useState("");
  const [compComment, setCompComment] = useState("");
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  // Filtering & Sorting State
  const [selectedFilterAmenities, setSelectedFilterAmenities] = useState<string[]>([]);
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"price" | "pricePerBed" | "distance">("price");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Helpers to parse input strings safely
  const parseNumberInput = (val: string): number => {
    const clean = val.replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Open Address Modal for Create
  const handleNewAddressClick = () => {
    setAddressToEdit(null);
    setAddrLabel("");
    setAddrFull("");
    setAddrRadius("5");
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  // Open Address Modal for Edit
  const handleEditAddressClick = () => {
    if (!selectedAddress) return;
    setAddressToEdit(selectedAddress);
    setAddrLabel(selectedAddress.label);
    setAddrFull(selectedAddress.fullAddress);
    setAddrRadius(selectedAddress.radiusKm.toString());
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  // Submit Address Form
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrLabel.trim() || !addrFull.trim()) return;

    setAddressError(null);
    const radius = parseNumberInput(addrRadius);

    try {
      if (addressToEdit) {
        await updateAddress(addressToEdit.id, {
          label: addrLabel.trim(),
          fullAddress: addrFull.trim(),
          radiusKm: radius > 0 ? radius : 5,
        });
      } else {
        const created = await addAddress({
          label: addrLabel.trim(),
          fullAddress: addrFull.trim(),
          radiusKm: radius > 0 ? radius : 5,
        });
        await selectAddress(created.id);
      }
      setIsAddressModalOpen(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Error saving address");
    }
  };

  // Open Competitor Modal for Create
  const handleNewCompetitorClick = () => {
    setCompetitorToEdit(null);
    setCompName("");
    setCompPrice("");
    setCompBeds("1");
    setCompSurface("");
    setCompDistance("");
    setCompAmenities([]);
    setCompPlatform("Airbnb");
    setCustomPlatform("");
    setCompComment("");
    setCompetitorError(null);
    setIsCompetitorModalOpen(true);
  };

  // Open Competitor Modal for Edit
  const handleEditCompetitorClick = (c: Competitor) => {
    setCompetitorToEdit(c);
    setCompName(c.name);
    setCompPrice(c.pricePerNight.toString());
    setCompBeds(c.bedCount.toString());
    setCompSurface(c.surfaceM2 !== undefined && c.surfaceM2 !== null ? c.surfaceM2.toString() : "");
    setCompDistance(c.distanceKm !== undefined && c.distanceKm !== null ? c.distanceKm.toString() : "");
    setCompAmenities(c.amenities);
    setCompComment(c.comment || "");
    const plat = c.platform || "Airbnb";
    if (["Airbnb", "Booking.com", "Vrbo"].includes(plat)) {
      setCompPlatform(plat);
      setCustomPlatform("");
    } else {
      setCompPlatform("Other");
      setCustomPlatform(plat);
    }
    setCompetitorError(null);
    setIsCompetitorModalOpen(true);
  };

  // Submit Competitor Form
  const handleCompetitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) return;
    if (!compName.trim()) return;

    setCompetitorError(null);
    const price = parseNumberInput(compPrice);
    const beds = Math.max(1, Math.round(parseNumberInput(compBeds)));
    
    const surfaceStr = compSurface.trim();
    const distanceStr = compDistance.trim();
    const surface = surfaceStr ? Math.max(1, parseNumberInput(surfaceStr)) : null;
    const distance = distanceStr ? parseNumberInput(distanceStr) : null;
    
    const finalPlatform = compPlatform === "Other" ? (customPlatform.trim() || "Other") : compPlatform;

    const data = {
      addressId: selectedAddress.id,
      name: compName.trim(),
      pricePerNight: price,
      bedCount: beds,
      surfaceM2: surface as any,
      distanceKm: distance as any,
      amenities: compAmenities,
      platform: finalPlatform,
      comment: compComment.trim(),
    };

    try {
      if (competitorToEdit) {
        await updateCompetitor(competitorToEdit.id, data);
      } else {
        await addCompetitor(data);
      }
      setIsCompetitorModalOpen(false);
    } catch (err) {
      setCompetitorError(err instanceof Error ? err.message : "Error saving competitor");
    }
  };

  const handleToggleAmenityInForm = (amenityId: string) => {
    setCompAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  const handleToggleFilterAmenity = (amenityId: string) => {
    setSelectedFilterAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  // Delete Competitor Confirmed
  const handleDeleteCompClick = (id: string) => {
    setCompetitorToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const executeDeleteCompetitor = async () => {
    if (competitorToDelete) {
      await deleteCompetitor(competitorToDelete);
      setIsDeleteConfirmOpen(false);
      setCompetitorToDelete(null);
    }
  };

  // Dynamic list of platforms to filter by
  const platforms = useMemo(() => {
    const pSet = new Set<string>();
    pSet.add("All");
    pSet.add("Airbnb");
    pSet.add("Booking.com");
    pSet.add("Vrbo");
    competitors.forEach((c) => {
      if (c.addressId === selectedAddress?.id && c.platform) {
        pSet.add(c.platform);
      }
    });
    return Array.from(pSet);
  }, [competitors, selectedAddress]);

  // Filtered and Sorted Competitor List
  const filteredCompetitors = useMemo(() => {
    if (!selectedAddress) return [];
    
    // Filter by Selected Address
    let list = competitors.filter((c) => c.addressId === selectedAddress.id);

    // Filter by Platform
    if (selectedPlatformFilter !== "All") {
      list = list.filter((c) => (c.platform || "Airbnb") === selectedPlatformFilter);
    }

    // Filter by Amenities (Competitor must have ALL selected amenities)
    if (selectedFilterAmenities.length > 0) {
      list = list.filter((c) => 
        selectedFilterAmenities.every((amenId) => c.amenities.includes(amenId))
      );
    }

    // Sort Competitors
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "price") {
        valA = a.pricePerNight;
        valB = b.pricePerNight;
      } else if (sortBy === "pricePerBed") {
        const bedA = a.bedCount > 0 ? a.bedCount : 1;
        const bedB = b.bedCount > 0 ? b.bedCount : 1;
        valA = a.pricePerNight / bedA;
        valB = b.pricePerNight / bedB;
      } else if (sortBy === "distance") {
        valA = a.distanceKm !== undefined && a.distanceKm !== null ? a.distanceKm : Infinity;
        valB = b.distanceKm !== undefined && b.distanceKm !== null ? b.distanceKm : Infinity;
      }

      if (sortAsc) {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    return list;
  }, [competitors, selectedAddress, selectedFilterAmenities, selectedPlatformFilter, sortBy, sortAsc]);

  // Count amenities for filter counts
  const amenityMap = useMemo(() => {
    return new Map(amenities.map((a) => [a.id, a.label]));
  }, [amenities]);

  const getPlatformBadgeColor = (platform: string) => {
    const plat = platform.toLowerCase();
    if (plat.includes("airbnb")) {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30";
    } else if (plat.includes("booking")) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30";
    } else if (plat.includes("vrbo") || plat.includes("abritel")) {
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/30";
    }
    return "bg-neutral-50 text-neutral-600 dark:bg-zinc-800 dark:text-neutral-300 border-neutral-200 dark:border-zinc-700";
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden border border-neutral-200/40 dark:border-zinc-800 bg-black">
            <img src="/airpricer.svg" alt="AirPricer Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            AirPricer
          </h1>
        </div>
      </div>

      {/* Address Selector Section */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] transition-theme">
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 block mb-3 text-neutral-500 dark:text-neutral-400">
          Target Location
        </span>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {addresses.length === 0 ? (
              <div className="text-neutral-500 dark:text-neutral-400">
                No addresses created yet. Add one to start analyzing competitors.
              </div>
            ) : (
              <div className="relative inline-block w-full max-w-md">
                <select
                  value={settings.selectedAddressId || ""}
                  onChange={(e) => selectAddress(e.target.value || null)}
                  className="w-full pl-4 pr-10 py-3 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none font-medium text-base transition-theme cursor-pointer"
                >
                  <option value="" disabled>Select an address...</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                  <ChevronDown size={18} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <button
              onClick={handleNewAddressClick}
              className="flex items-center gap-1.5 px-4 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-100 font-medium rounded-xl transition-all active:scale-95 cursor-pointer text-sm"
            >
              <Plus size={16} />
              <span>New Address</span>
            </button>
            {selectedAddress && (
              <>
                <button
                  onClick={handleEditAddressClick}
                  className="p-3 bg-white hover:bg-neutral-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Edit Address"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => setIsAddressDeleteConfirmOpen(true)}
                  className="p-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Delete Address"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {selectedAddress && (
          <div className="mt-6 flex flex-wrap gap-y-2 gap-x-6 text-sm text-neutral-600 dark:text-neutral-400 border-t border-neutral-200/50 dark:border-zinc-800/50 pt-4">
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-sky-500" />
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{selectedAddress.fullAddress}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Compass size={15} className="text-emerald-500" />
              <span>Search Radius: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedAddress.radiusKm} km</span></span>
            </div>
          </div>
        )}
      </section>

      {/* Main Competitors Grid & Controls */}
      {selectedAddress ? (
        <div className="space-y-6">
          {/* Header Row for Competitor List */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Competitor Listings <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">({filteredCompetitors.length})</span>
            </h2>
            <button 
              onClick={handleNewCompetitorClick}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md hover:shadow-sky-500/15 active:scale-95 transition-all cursor-pointer text-xs"
            >
              <Plus size={16} />
              <span>Add Competitor</span>
            </button>
          </div>

          {/* Controls Bar (Sorting & Filter buttons) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-100/50 dark:bg-zinc-900/20 p-4 rounded-2xl border border-neutral-200/50 dark:border-zinc-800/50">
            {/* Sorting */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Sort:
              </span>
              <button
                onClick={() => { setSortBy("price"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sortBy === "price"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-zinc-700"
                }`}
              >
                Price
              </button>
              <button
                onClick={() => { setSortBy("pricePerBed"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sortBy === "pricePerBed"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-zinc-700"
                }`}
              >
                Price/Bed
              </button>
              <button
                onClick={() => { setSortBy("distance"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sortBy === "distance"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-zinc-700"
                }`}
              >
                Distance
              </button>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="p-1.5 text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-zinc-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                title={sortAsc ? "Ascending" : "Descending"}
              >
                <ArrowUpDown size={14} className="inline" />
              </button>
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                Platform:
              </span>
              <select
                value={selectedPlatformFilter}
                onChange={(e) => setSelectedPlatformFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {platforms.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  selectedFilterAmenities.length > 0
                    ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30"
                    : "bg-white dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700/50"
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Amenities Filter</span>
                {selectedFilterAmenities.length > 0 && (
                  <span className="ml-1 bg-sky-500 text-white text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                    {selectedFilterAmenities.length}
                  </span>
                )}
              </button>

              {selectedFilterAmenities.length > 0 && (
                <button
                  onClick={() => setSelectedFilterAmenities([])}
                  className="p-2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer"
                  title="Clear All Filters"
                >
                  <FilterX size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Tags */}
          {selectedFilterAmenities.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 text-neutral-500 dark:text-neutral-400">
                Active filters:
              </span>
              {selectedFilterAmenities.map((amenId) => {
                const label = amenityMap.get(amenId) || amenId;
                return (
                  <span
                    key={amenId}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 rounded-full border border-sky-100 dark:border-sky-900/30"
                  >
                    <span>{label}</span>
                    <button
                      onClick={() => handleToggleFilterAmenity(amenId)}
                      className="hover:bg-sky-200 dark:hover:bg-sky-900 p-0.5 rounded-full cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Competitor List Cards */}
          {filteredCompetitors.length === 0 ? (
            <div className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 p-12 text-center rounded-3xl">
              <span className="text-neutral-400 dark:text-neutral-500 text-lg block mb-2 font-medium">
                No matching competitors
              </span>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {selectedFilterAmenities.length > 0 
                  ? "Try loosening your amenities filter checklist." 
                  : "Click the 'Add Competitor' button above to create one."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCompetitors.map((c) => {
                // Safeguarded computations to prevent NaN/Infinity/division by zero
                const bedCountSafe = c.bedCount > 0 ? c.bedCount : 1;
                const pricePerBed = c.pricePerNight / bedCountSafe;
                
                const hasSurface = c.surfaceM2 !== undefined && c.surfaceM2 !== null && c.surfaceM2 > 0;
                const pricePerM2 = hasSurface ? c.pricePerNight / (c.surfaceM2 as number) : null;

                const hasDistance = c.distanceKm !== undefined && c.distanceKm !== null;

                return (
                  <div 
                    key={c.id} 
                    className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 p-6 rounded-3xl shadow-sm transition-theme flex flex-col justify-between hover:shadow-md"
                  >
                    <div>
                      {/* Card Title & Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="min-w-0">
                          <h4 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                            {c.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {hasDistance ? (
                              <>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                                  <Compass size={11} />
                                  {c.distanceKm} km from target
                                </span>
                                <span className="text-neutral-300 dark:text-zinc-750 text-[10px]">•</span>
                              </>
                            ) : null}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide border ${getPlatformBadgeColor(c.platform || "Airbnb")}`}>
                              {c.platform || "Airbnb"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <div className="text-xl font-extrabold text-neutral-900 dark:text-white">
                            ${c.pricePerNight}
                          </div>
                          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">
                            per night
                          </div>
                        </div>
                      </div>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl text-xs">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-neutral-200/50 dark:bg-zinc-800 rounded-lg text-neutral-500 dark:text-neutral-400">
                            <Bed size={13} />
                          </div>
                          <div>
                            <div className="text-neutral-400 dark:text-neutral-500 font-medium text-[9px] uppercase tracking-wide">Beds</div>
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200">{c.bedCount} beds</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-neutral-200/50 dark:bg-zinc-800 rounded-lg text-neutral-500 dark:text-neutral-400">
                            <Expand size={13} />
                          </div>
                          <div>
                            <div className="text-neutral-400 dark:text-neutral-500 font-medium text-[9px] uppercase tracking-wide">Surface</div>
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {hasSurface ? `${c.surfaceM2} m²` : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-neutral-100 dark:border-zinc-800/50 pt-2 col-span-2">
                          <div className="p-1.5 bg-neutral-200/50 dark:bg-zinc-800 rounded-lg text-neutral-500 dark:text-neutral-400">
                            <DollarSign size={13} />
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-neutral-400 dark:text-neutral-500 font-medium text-[9px] uppercase tracking-wide">Price/Bed</div>
                              <div className="font-semibold text-neutral-800 dark:text-neutral-200">${pricePerBed.toFixed(1)}</div>
                            </div>
                            <div>
                              <div className="text-neutral-400 dark:text-neutral-500 font-medium text-[9px] uppercase tracking-wide">Price/m²</div>
                              <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {pricePerM2 !== null ? `$${pricePerM2.toFixed(1)}` : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Amenities Pills */}
                      {c.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {c.amenities.map((amenId) => {
                            const label = amenityMap.get(amenId) || amenId;
                            return (
                              <span 
                                key={amenId} 
                                className="text-[10px] font-medium px-2.5 py-0.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300 rounded-full"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Comment Note */}
                      {c.comment && c.comment.trim() && (
                        <div className="mb-4 p-3 bg-neutral-50 dark:bg-zinc-800/30 border border-neutral-100 dark:border-zinc-850 rounded-2xl text-xs text-neutral-600 dark:text-neutral-300 flex gap-2 items-start">
                          <MessageSquare size={13} className="text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
                          <p className="italic leading-relaxed break-words">
                            {c.comment}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-zinc-800/50 pt-4 mt-auto">
                      <button
                        onClick={() => handleEditCompetitorClick(c)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer border border-neutral-200 dark:border-zinc-700"
                      >
                        <Edit3 size={13} />
                        <span>Modify</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCompClick(c.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all active:scale-95 cursor-pointer border border-rose-100 dark:border-rose-900/30"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        addresses.length > 0 && (
          <div className="bg-neutral-50 dark:bg-zinc-900/30 border border-dashed border-neutral-200 dark:border-zinc-800 p-12 text-center rounded-[32px]">
            <span className="text-neutral-400 dark:text-neutral-500 text-lg block mb-2 font-medium">
              No target address selected
            </span>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Select one of your saved locations from the target dropdown menu above.
            </p>
          </div>
        )
      )}

      {/* Address CREATE & EDIT Modal */}
      <Modal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)}
        title={addressToEdit ? "Edit Address Details" : "Create New Location"}
      >
        <form onSubmit={handleAddressSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Label / Title
            </label>
            <input
              type="text"
              required
              value={addrLabel}
              onChange={(e) => setAddrLabel(e.target.value)}
              placeholder="e.g., Parisian Loft near Marais"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Full Street Address
            </label>
            <input
              type="text"
              required
              value={addrFull}
              onChange={(e) => setAddrFull(e.target.value)}
              placeholder="e.g., 24 Rue de Rivoli, 75004 Paris"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Target Radius (Km)
            </label>
            <input
              type="text"
              required
              value={addrRadius}
              onChange={(e) => setAddrRadius(e.target.value)}
              placeholder="e.g., 5"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] mt-2 cursor-pointer"
          >
            {addressToEdit ? "Save Changes" : "Create Location"}
          </button>

          {addressError && (
            <p className="text-rose-600 dark:text-rose-400 text-xs font-semibold bg-rose-50 dark:bg-rose-950/15 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center leading-relaxed">
              {addressError}
            </p>
          )}
        </form>
      </Modal>

      {/* Competitor CREATE & EDIT Modal */}
      <Modal
        isOpen={isCompetitorModalOpen}
        onClose={() => setIsCompetitorModalOpen(false)}
        title={competitorToEdit ? "Modify Competitor" : "Add Competitor Entry"}
      >
        <form onSubmit={handleCompetitorSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Competitor Name / Title
            </label>
            <input
              type="text"
              required
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="e.g., Cozy Suite Seine View"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Platform
              </label>
              <select
                value={compPlatform}
                onChange={(e) => setCompPlatform(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm cursor-pointer"
              >
                <option value="Airbnb">Airbnb</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Vrbo">Vrbo</option>
                <option value="Other">Other (Custom)</option>
              </select>
            </div>

            {compPlatform === "Other" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Custom Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="e.g., Abritel, Expedia"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Price / Night ($)
              </label>
              <input
                type="text"
                required
                value={compPrice}
                onChange={(e) => setCompPrice(e.target.value)}
                placeholder="e.g., 120"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Bed Count
              </label>
              <input
                type="text"
                required
                value={compBeds}
                onChange={(e) => setCompBeds(e.target.value)}
                placeholder="e.g., 2"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Surface (m²) (Optional)
              </label>
              <input
                type="text"
                value={compSurface}
                onChange={(e) => setCompSurface(e.target.value)}
                placeholder="e.g., 45"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Distance (Km) (Optional)
              </label>
              <input
                type="text"
                value={compDistance}
                onChange={(e) => setCompDistance(e.target.value)}
                placeholder="e.g., 0.8"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Amenities Available
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-2 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-100 dark:border-zinc-800 rounded-2xl">
              {amenities.map((am) => (
                <button
                  type="button"
                  key={am.id}
                  onClick={() => handleToggleAmenityInForm(am.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    compAmenities.includes(am.id)
                      ? "bg-sky-50 dark:bg-sky-950/25 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                      : "bg-zinc-100/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                    compAmenities.includes(am.id) 
                      ? "bg-sky-500 border-sky-500 text-white" 
                      : "border-neutral-400 dark:border-zinc-600"
                  }`}>
                    {compAmenities.includes(am.id) && <Check size={10} />}
                  </div>
                  <span className="truncate">{am.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Short Comment / Notes (Optional)
            </label>
            <textarea
              value={compComment}
              onChange={(e) => setCompComment(e.target.value)}
              placeholder="e.g., Close to metro, noisy street, great host..."
              rows={2}
              maxLength={150}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm resize-none"
            />
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-right">
              {compComment.length}/150 characters
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-semibold rounded-2xl shadow-md transition-all active:scale-[0.98] mt-2 cursor-pointer"
          >
            {competitorToEdit ? "Save Competitor" : "Add Competitor"}
          </button>

          {competitorError && (
            <p className="text-rose-600 dark:text-rose-400 text-xs font-semibold bg-rose-50 dark:bg-rose-950/15 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center leading-relaxed">
              {competitorError}
            </p>
          )}
        </form>
      </Modal>

      {/* Filter Amenities List Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter by Required Amenities"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Show only competitors that contain all of the selected amenities.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto p-2 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-100 dark:border-zinc-800 rounded-2xl">
            {amenities.map((am) => (
              <button
                type="button"
                key={am.id}
                onClick={() => handleToggleFilterAmenity(am.id)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                  selectedFilterAmenities.includes(am.id)
                    ? "bg-sky-50 dark:bg-sky-950/25 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                    : "bg-neutral-50 dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-zinc-805"
                }`}
              >
                <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                  selectedFilterAmenities.includes(am.id) 
                    ? "bg-sky-500 border-sky-500 text-white" 
                    : "border-neutral-400 dark:border-zinc-600"
                }`}>
                  {selectedFilterAmenities.includes(am.id) && <Check size={10} />}
                </div>
                <span className="truncate">{am.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setSelectedFilterAmenities([])}
              className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-200 font-semibold rounded-2xl transition-all cursor-pointer text-sm"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="flex-1 py-3 bg-neutral-950 dark:bg-white hover:bg-neutral-900 text-white dark:text-neutral-950 font-semibold rounded-2xl transition-all cursor-pointer text-sm"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Are you absolutely sure you want to delete this competitor entry? This action is permanent and cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={executeDeleteCompetitor}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Address Delete Confirmation Modal */}
      <Modal
        isOpen={isAddressDeleteConfirmOpen}
        onClose={() => setIsAddressDeleteConfirmOpen(false)}
        title="Confirm Address Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Are you absolutely sure you want to delete the address <strong className="text-neutral-900 dark:text-white">"{selectedAddress?.label}"</strong>? All attached competitor listings for this location will be permanently deleted. This action is permanent and cannot be undone.
          </p>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setIsAddressDeleteConfirmOpen(false)}
              className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (selectedAddress) {
                  await deleteAddress(selectedAddress.id);
                  setIsAddressDeleteConfirmOpen(false);
                }
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-750 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
