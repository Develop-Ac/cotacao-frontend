import MultiSelect from "@/components/MultiSelect";
import { FaSearch } from "react-icons/fa";

interface PromotionFiltersProps {
    days: number;
    setDays: (days: number) => void;
    categories: string[];
    selectedCategories: string[];
    setSelectedCategories: (categories: string[]) => void;
    subgroups: string[];
    selectedSubgroups: string[];
    setSelectedSubgroups: (subgroups: string[]) => void;
    brandSearch: string;
    setBrandSearch: (search: string) => void;
    handleRun: () => void;
    loading: boolean;
    expanded: boolean;
}

export default function PromotionFilters({
    days,
    setDays,
    categories,
    selectedCategories,
    setSelectedCategories,
    subgroups,
    selectedSubgroups,
    setSelectedSubgroups,
    brandSearch,
    setBrandSearch,
    handleRun,
    loading,
    expanded
}: PromotionFiltersProps) {
    return (
        <div className={`
            bg-white dark:bg-boxdark border-b border-gray-100 dark:border-strokedark shadow-sm z-10 transition-all duration-300 ease-in-out overflow-hidden
            ${expanded ? "max-h-[400px] opacity-100 p-4" : "max-h-0 opacity-0 p-0 border-none"}
        `}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Dias de Cobertura
                    </label>
                    <input
                        type="number"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Cat. Saldo Atual
                    </label>
                    <MultiSelect
                        options={categories.map(c => ({ label: c, value: c }))}
                        value={selectedCategories}
                        onChange={setSelectedCategories}
                        placeholder="Todas as categorias"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Subgrupos
                    </label>
                    <MultiSelect
                        options={subgroups.map(s => ({ label: s, value: s }))}
                        value={selectedSubgroups}
                        onChange={setSelectedSubgroups}
                        placeholder="Todos os subgrupos"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Marcas
                    </label>
                    <input
                        type="text"
                        placeholder="Buscar marca..."
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2 px-3 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                    />
                </div>

                <div className="md:col-span-2">
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                        {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <FaSearch />}
                        {loading ? "Calculando..." : "Gerar Plano"}
                    </button>
                </div>
            </div>
        </div>
    );
}
