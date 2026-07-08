import React, { useState, useMemo } from "react";
import { useData } from "../providers/DataProvider";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Building, 
  DollarSign, 
  Bed, 
  Maximize2,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  FilterX
} from "lucide-react";
import { Modal } from "../components/Modal";

export const Statistics: React.FC = () => {
  const { 
    addresses, 
    competitors, 
    amenities, 
    settings,
    selectAddress
  } = useData();

  const isDark = settings.theme === "dark";

  // Selected Address State
  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a.id === settings.selectedAddressId) || null;
  }, [addresses, settings.selectedAddressId]);

  // Modal controls
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedFilterAmenities, setSelectedFilterAmenities] = useState<string[]>([]);
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

  // Toggle filter amenity
  const handleToggleFilterAmenity = (amenityId: string) => {
    setSelectedFilterAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  };

  // Filtered Competitors List for stats
  const filteredCompetitors = useMemo(() => {
    if (!selectedAddress) return [];
    
    let list = competitors.filter((c) => c.addressId === selectedAddress.id);

    // Apply Platform Filter
    if (selectedPlatform !== "All") {
      list = list.filter((c) => (c.platform || "Airbnb") === selectedPlatform);
    }

    // Apply active amenity filters (Competitor must contain ALL selected filters)
    if (selectedFilterAmenities.length > 0) {
      list = list.filter((c) => 
        selectedFilterAmenities.every((amenId) => c.amenities.includes(amenId))
      );
    }
    return list;
  }, [competitors, selectedAddress, selectedFilterAmenities, selectedPlatform]);

  // Calculated Stats
  const stats = useMemo(() => {
    if (filteredCompetitors.length === 0) {
      return {
        count: 0,
        meanPrice: 0,
        meanPricePerBed: 0,
        meanPricePerM2: null as number | null,
      };
    }

    const count = filteredCompetitors.length;

    // 1. Mean Total Price
    const totalPrice = filteredCompetitors.reduce((sum, c) => sum + c.pricePerNight, 0);
    const meanPrice = totalPrice / count;

    // 2. Mean Price Per Bed (exclude bedCount <= 0 rows)
    const validBedRows = filteredCompetitors.filter((c) => c.bedCount > 0);
    const meanPricePerBed = validBedRows.length > 0
      ? validBedRows.reduce((sum, c) => sum + (c.pricePerNight / c.bedCount), 0) / validBedRows.length
      : 0;

    // 3. Mean Price Per m² (exclude surfaceM2 <= 0 rows)
    const validM2Rows = filteredCompetitors.filter((c) => c.surfaceM2 !== undefined && c.surfaceM2 !== null && c.surfaceM2 > 0);
    const meanPricePerM2 = validM2Rows.length > 0
      ? validM2Rows.reduce((sum, c) => sum + (c.pricePerNight / (c.surfaceM2 as number)), 0) / validM2Rows.length
      : null;

    return {
      count,
      meanPrice,
      meanPricePerBed,
      meanPricePerM2,
    };
  }, [filteredCompetitors]);

  // Price Distribution Histogram Bins
  const histogramData = useMemo(() => {
    if (filteredCompetitors.length === 0) return [];
    
    const prices = filteredCompetitors.map((c) => c.pricePerNight);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      return [
        { name: `$${minPrice}`, count: filteredCompetitors.length }
      ];
    }

    const binCount = Math.min(5, filteredCompetitors.length);
    const diff = maxPrice - minPrice;
    const step = Math.ceil(diff / binCount);
    
    const result = [];
    for (let i = 0; i < binCount; i++) {
      const start = minPrice + i * step;
      const end = start + step;
      const name = `$${start}-${end - 1}`;
      
      const count = filteredCompetitors.filter((c) => {
        if (i === binCount - 1) {
          // Last bin is inclusive of end
          return c.pricePerNight >= start && c.pricePerNight <= maxPrice;
        }
        return c.pricePerNight >= start && c.pricePerNight < end;
      }).length;

      result.push({ name, count });
    }
    return result;
  }, [filteredCompetitors]);

  // Amenity Lookup map
  const amenityMap = useMemo(() => {
    return new Map(amenities.map((a) => [a.id, a.label]));
  }, [amenities]);

  return (
    <div className="space-y-8 pb-32">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
          Competitor Statistics
        </h1>
      </div>

      {/* Target Location and Selector */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] transition-theme">
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 block mb-3 text-neutral-500 dark:text-neutral-400">
          Target Location
        </span>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {addresses.length === 0 ? (
              <div className="text-neutral-500 dark:text-neutral-400">
                No addresses created yet. Add one in Home tab to start analyzing.
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

          {selectedAddress && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Platform Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                  Platform:
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

              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  selectedFilterAmenities.length > 0
                    ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30"
                    : "bg-white dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700/50"
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filter Stats</span>
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
                  title="Clear Filters"
                >
                  <FilterX size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        {selectedAddress && selectedFilterAmenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 items-center border-t border-neutral-200/50 dark:border-zinc-800/50 pt-3">
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 text-neutral-500 dark:text-neutral-400">
              Filtering stats by:
            </span>
            {selectedFilterAmenities.map((amenId) => {
              const label = amenityMap.get(amenId) || amenId;
              return (
                <span
                  key={amenId}
                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 rounded-full border border-sky-100 dark:border-sky-900/30"
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
      </section>

      {/* Statistics Output */}
      {selectedAddress ? (
        filteredCompetitors.length === 0 ? (
          <div className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800/80 p-12 text-center rounded-3xl">
            <span className="text-neutral-400 dark:text-neutral-500 text-lg block mb-2 font-medium">
              No matching competitor data
            </span>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {selectedFilterAmenities.length > 0
                ? "Try relaxing your selected amenities filters."
                : "Add some competitors for this address in the Home tab."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Count */}
              <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm transition-theme">
                <div className="flex items-center justify-between mb-3 text-neutral-400">
                  <span className="text-[9px] uppercase font-bold tracking-widest">Competitors</span>
                  <Building size={16} className="text-neutral-400" />
                </div>
                <div className="text-2xl font-extrabold text-neutral-950 dark:text-white">
                  {stats.count}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-medium">
                  matched properties
                </div>
              </div>

              {/* Mean Price */}
              <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm transition-theme">
                <div className="flex items-center justify-between mb-3 text-neutral-400">
                  <span className="text-[9px] uppercase font-bold tracking-widest">Mean Price</span>
                  <DollarSign size={16} className="text-sky-500" />
                </div>
                <div className="text-2xl font-extrabold text-neutral-950 dark:text-white">
                  ${stats.meanPrice.toFixed(0)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-medium">
                  average total night
                </div>
              </div>

              {/* Mean Price Per Bed */}
              <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm transition-theme">
                <div className="flex items-center justify-between mb-3 text-neutral-400">
                  <span className="text-[9px] uppercase font-bold tracking-widest">Avg Price/Bed</span>
                  <Bed size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-neutral-950 dark:text-white">
                  ${stats.meanPricePerBed.toFixed(1)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-medium">
                  normalized per bed
                </div>
              </div>

              {/* Mean Price Per M2 */}
              <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm transition-theme">
                <div className="flex items-center justify-between mb-3 text-neutral-400">
                  <span className="text-[9px] uppercase font-bold tracking-widest">Avg Price/m²</span>
                  <Maximize2 size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-neutral-950 dark:text-white">
                  {stats.meanPricePerM2 !== null ? `$${stats.meanPricePerM2.toFixed(1)}` : "—"}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 font-medium">
                  normalized space
                </div>
              </div>
            </div>

            {/* Histogram Section */}
            <div className="bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-6 sm:p-8 rounded-[32px] transition-theme">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 block mb-4 text-neutral-500 dark:text-neutral-400">
                Price Distribution
              </span>
              
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={histogramData}
                    margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? "#52525b" : "#a3a3a3"} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke={isDark ? "#52525b" : "#a3a3a3"} 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }} 
                      contentStyle={{ 
                        backgroundColor: isDark ? "#18181b" : "#ffffff", 
                        borderColor: isDark ? "#27272a" : "#e4e4e7", 
                        color: isDark ? "#ffffff" : "#0f172a", 
                        borderRadius: "16px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                        fontFamily: "Inter, sans-serif"
                      }} 
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#0ea5e9" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      ) : (
        addresses.length > 0 && (
          <div className="bg-neutral-50 dark:bg-zinc-900/30 border border-dashed border-neutral-200 dark:border-zinc-800 p-12 text-center rounded-[32px]">
            <span className="text-neutral-400 dark:text-neutral-500 text-lg block mb-2 font-medium">
              No target address selected
            </span>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Select one of your target locations above to evaluate statistics.
            </p>
          </div>
        )
      )}

      {/* Filter Stats Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Statistics"
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Show statistics computed only from competitors matching these amenities.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto p-2 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-100 dark:border-zinc-800 rounded-2xl">
            {amenities.map((am) => (
              <button
                type="button"
                key={am.id}
                onClick={() => handleToggleFilterAmenity(am.id)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                  selectedFilterAmenities.includes(am.id)
                    ? "bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                    : "bg-zinc-100/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                }`}
              >
                <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                  selectedFilterAmenities.includes(am.id) 
                    ? "bg-sky-500 border-sky-500 text-white" 
                    : "border-neutral-300 dark:border-zinc-750"
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
              Clear All
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
    </div>
  );
};
