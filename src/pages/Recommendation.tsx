import React, { useState, useMemo, useEffect } from "react";
import { useData } from "../providers/DataProvider";
import { 
  DollarSign, 
  Bed, 
  Maximize2, 
  HelpCircle,
  TrendingUp,
  Award,
  Users,
  Compass,
  AlertCircle,
  Check
} from "lucide-react";

export const Recommendation: React.FC = () => {
  const { 
    addresses, 
    competitors, 
    amenities, 
    settings 
  } = useData();

  // Selected Address State
  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a.id === settings.selectedAddressId) || null;
  }, [addresses, settings.selectedAddressId]);

  // Own Property Input States (Persist calculator settings locally for UX)
  const [ownBeds, setOwnBeds] = useState(() => {
    return localStorage.getItem("airpricer_own_beds") || "2";
  });
  const [ownSurface, setOwnSurface] = useState(() => {
    return localStorage.getItem("airpricer_own_surface") || "45";
  });
  const [ownAmenities, setOwnAmenities] = useState<string[]>(() => {
    const cached = localStorage.getItem("airpricer_own_amenities");
    return cached ? JSON.parse(cached) : ["amenity_wifi", "amenity_parking"];
  });

  const [selectedPlatform, setSelectedPlatform] = useState("All");

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

  // Keep inputs cached
  useEffect(() => {
    localStorage.setItem("airpricer_own_beds", ownBeds);
  }, [ownBeds]);

  useEffect(() => {
    localStorage.setItem("airpricer_own_surface", ownSurface);
  }, [ownSurface]);

  useEffect(() => {
    localStorage.setItem("airpricer_own_amenities", JSON.stringify(ownAmenities));
  }, [ownAmenities]);

  const handleToggleOwnAmenity = (amenityId: string) => {
    setOwnAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  const parseNumberInput = (val: string): number => {
    const clean = val.replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Recommendation Engine Calculations
  const recommendation = useMemo(() => {
    if (!selectedAddress) return null;

    // Filter competitors of selected address
    let pool = competitors.filter((c) => c.addressId === selectedAddress.id);

    // Apply Platform Filter
    if (selectedPlatform !== "All") {
      pool = pool.filter((c) => (c.platform || "Airbnb") === selectedPlatform);
    }

    if (pool.length === 0) return null;

    // Filter by own selected amenities (Competitor must include all of our own amenities)
    let matchedPool = pool.filter((c) => 
      ownAmenities.every((amenId) => c.amenities.includes(amenId))
    );

    let isFallback = false;
    // Fall back to all competitors for selected address if zero exact matches
    if (matchedPool.length === 0) {
      matchedPool = pool;
      isFallback = true;
    }

    const matchedCount = matchedPool.length;

    // Inputs
    const beds = Math.max(0, parseNumberInput(ownBeds));
    const surface = Math.max(0, parseNumberInput(ownSurface));

    // Calculate candidate averages
    const candidates: number[] = [];

    // Candidate 1: Mean Total Price of Matched Competitors
    const meanTotal = matchedPool.reduce((sum, c) => sum + c.pricePerNight, 0) / matchedCount;
    if (!isNaN(meanTotal) && isFinite(meanTotal)) {
      candidates.push(meanTotal);
    }

    // Candidate 2: Mean Price per Bed of Matched Competitors * Own Bed Count (only if beds > 0)
    if (beds > 0) {
      const validBedRows = matchedPool.filter((c) => c.bedCount > 0);
      const meanPricePerBed = validBedRows.length > 0
        ? validBedRows.reduce((sum, c) => sum + (c.pricePerNight / c.bedCount), 0) / validBedRows.length
        : 0;
      const candidateBeds = meanPricePerBed * beds;
      if (candidateBeds > 0 && !isNaN(candidateBeds) && isFinite(candidateBeds)) {
        candidates.push(candidateBeds);
      }
    }

    // Candidate 3: Mean Price per m² of Matched Competitors * Own Surface (only if surface > 0)
    if (surface > 0) {
      const validM2Rows = matchedPool.filter((c) => c.surfaceM2 !== undefined && c.surfaceM2 !== null && c.surfaceM2 > 0);
      const meanPricePerM2 = validM2Rows.length > 0
        ? validM2Rows.reduce((sum, c) => sum + (c.pricePerNight / (c.surfaceM2 as number)), 0) / validM2Rows.length
        : 0;
      const candidateSurface = meanPricePerM2 * surface;
      if (candidateSurface > 0 && !isNaN(candidateSurface) && isFinite(candidateSurface)) {
        candidates.push(candidateSurface);
      }
    }

    // Recommended Price is the average of valid candidate values
    const recommendedPrice = candidates.length > 0
      ? candidates.reduce((sum, v) => sum + v, 0) / candidates.length
      : meanTotal;

    // Max Price: 90th percentile if >= 3 matched, otherwise the maximum price in the matched pool
    let maxPrice = 0;
    const prices = matchedPool.map((c) => c.pricePerNight).sort((a, b) => a - b);

    if (prices.length >= 3) {
      // 90th percentile formula
      const pctIndex = 0.9 * (prices.length - 1);
      const lower = Math.floor(pctIndex);
      const upper = Math.ceil(pctIndex);
      const weight = pctIndex - lower;
      maxPrice = prices[lower] * (1 - weight) + prices[upper] * weight;
    } else if (prices.length > 0) {
      maxPrice = Math.max(...prices);
    }

    return {
      recommendedPrice: isNaN(recommendedPrice) || !isFinite(recommendedPrice) ? 0 : recommendedPrice,
      maxPrice: isNaN(maxPrice) || !isFinite(maxPrice) ? 0 : maxPrice,
      competitorsUsed: matchedCount,
      isFallback,
    };
  }, [selectedAddress, competitors, ownBeds, ownSurface, ownAmenities, selectedPlatform]);

  const amenityMap = useMemo(() => {
    return new Map(amenities.map((a) => [a.id, a.label]));
  }, [amenities]);

  return (
    <div className="space-y-8 pb-32">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
          Recommendation
        </h1>
      </div>

      {/* Main Form & Output Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Form Calculator Inputs */}
        <section className="lg:col-span-7 bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] space-y-6 transition-theme">
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 block text-neutral-500 dark:text-neutral-400">
            My Airbnb Specifications
          </span>

          {/* Reference Platform Selector */}
          <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-800/40 p-4 rounded-2xl border border-neutral-200/50 dark:border-zinc-800">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">
              Filter Reference Platform
            </span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              {platforms.map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bed Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide flex items-center gap-1">
                <Bed size={13} className="text-sky-500" />
                <span>Bed Count</span>
              </label>
              <input
                type="text"
                value={ownBeds}
                onChange={(e) => setOwnBeds(e.target.value)}
                placeholder="e.g., 2"
                className="w-full px-4 py-3 bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm font-medium"
              />
            </div>

            {/* Surface Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide flex items-center gap-1">
                <Maximize2 size={13} className="text-emerald-500" />
                <span>Surface (m²)</span>
              </label>
              <input
                type="text"
                value={ownSurface}
                onChange={(e) => setOwnSurface(e.target.value)}
                placeholder="e.g., 45"
                className="w-full px-4 py-3 bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-sm font-medium"
              />
            </div>
          </div>

          {/* Own Amenities Checkboxes */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide block">
              My Selected Amenities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-white dark:bg-zinc-800/40 border border-neutral-200/50 dark:border-zinc-800 rounded-2xl max-h-[220px] overflow-y-auto">
              {amenities.map((am) => (
                <button
                  type="button"
                  key={am.id}
                  onClick={() => handleToggleOwnAmenity(am.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    ownAmenities.includes(am.id)
                      ? "bg-sky-50 dark:bg-sky-950/25 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                      : "bg-zinc-100/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                    ownAmenities.includes(am.id) 
                      ? "bg-sky-500 border-sky-500 text-white" 
                      : "border-neutral-400 dark:border-zinc-600"
                  }`}>
                    {ownAmenities.includes(am.id) && <Check size={10} />}
                  </div>
                  <span className="truncate">{am.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Recommendation Engine Outputs */}
        <div className="lg:col-span-5 space-y-6">
          {!selectedAddress ? (
            <div className="bg-neutral-50 dark:bg-zinc-900 border border-dashed border-neutral-200 dark:border-zinc-800 p-8 rounded-[32px] text-center">
              <AlertCircle size={32} className="text-neutral-400 mx-auto mb-3" />
              <span className="text-neutral-400 dark:text-neutral-500 text-base block mb-1 font-medium">
                No target address selected
              </span>
              <p className="text-xs text-neutral-500">
                Please select a target address in the Home or Statistics tab first.
              </p>
            </div>
          ) : !recommendation ? (
            <div className="bg-neutral-50 dark:bg-zinc-900 border border-dashed border-neutral-200 dark:border-zinc-800 p-8 rounded-[32px] text-center">
              <AlertCircle size={32} className="text-neutral-400 mx-auto mb-3" />
              <span className="text-neutral-400 dark:text-neutral-500 text-base block mb-1 font-medium">
                No competitor data available
              </span>
              <p className="text-xs text-neutral-500">
                Please create some competitors for <span className="font-semibold">"{selectedAddress.label}"</span> under the Home tab.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Main Output Box */}
              <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-6 sm:p-8 rounded-[32px] shadow-sm transition-theme space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
                
                {/* Fallback Notice */}
                {recommendation.isFallback && (
                  <div className="flex items-start gap-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Amenties Fallback Active:</span> No competitors matched all {ownAmenities.length} selected amenities. Evaluation defaulted to all competitors at this location.
                    </div>
                  </div>
                )}

                {/* Recommended Price KPI */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                    <TrendingUp size={12} className="text-sky-500" />
                    <span>Recommended Price</span>
                  </span>
                  <div className="flex items-baseline text-neutral-950 dark:text-white">
                    <span className="text-5xl font-black">${recommendation.recommendedPrice.toFixed(0)}</span>
                    <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500 ml-1">/ night</span>
                  </div>
                </div>

                {/* Max Price KPI */}
                <div className="space-y-1 border-t border-neutral-100 dark:border-zinc-800/80 pt-5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                    <Award size={12} className="text-rose-500" />
                    <span>Maximum Price Cap (90th percentile)</span>
                  </span>
                  <div className="flex items-baseline text-neutral-950 dark:text-white">
                    <span className="text-3xl font-extrabold">${recommendation.maxPrice.toFixed(0)}</span>
                    <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 ml-1">/ night maximum</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 dark:border-zinc-800/80 pt-5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-neutral-400" />
                    <span>Based on {recommendation.competitorsUsed} listings</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Compass size={14} className="text-neutral-400" />
                    <span className="truncate">{selectedAddress.label}</span>
                  </div>
                </div>
              </div>

              {/* Recommendation Criteria Checklist Card */}
              <div className="bg-neutral-50 dark:bg-zinc-900/30 border border-neutral-100 dark:border-zinc-800/50 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Price Adjustments Utilized
                </h4>
                
                <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <li className="flex items-start gap-2">
                    <div className="p-0.5 bg-emerald-500/10 text-emerald-500 rounded-md mt-0.5 shrink-0">
                      <Check size={10} />
                    </div>
                    <span>Competitive baseline total nightly pricing model.</span>
                  </li>
                  {parseNumberInput(ownBeds) > 0 && (
                    <li className="flex items-start gap-2">
                      <div className="p-0.5 bg-emerald-500/10 text-emerald-500 rounded-md mt-0.5 shrink-0">
                        <Check size={10} />
                      </div>
                      <span>Normalized multiplier for <span className="font-semibold text-neutral-800 dark:text-neutral-200">{ownBeds}</span> requested beds.</span>
                    </li>
                  )}
                  {parseNumberInput(ownSurface) > 0 && (
                    <li className="flex items-start gap-2">
                      <div className="p-0.5 bg-emerald-500/10 text-emerald-500 rounded-md mt-0.5 shrink-0">
                        <Check size={10} />
                      </div>
                      <span>Normalized sizing factor for <span className="font-semibold text-neutral-800 dark:text-neutral-200">{ownSurface} m²</span> surface space.</span>
                    </li>
                  )}
                  {ownAmenities.length > 0 && (
                    <li className="flex items-start gap-2">
                      <div className="p-0.5 bg-sky-500/10 text-sky-500 rounded-md mt-0.5 shrink-0">
                        <Check size={10} />
                      </div>
                      <span>Refined targeting matched across {ownAmenities.length} requested amenities.</span>
                    </li>
                  )}
                </ul>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
