export default function Loading() {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
            <div className="relative w-12 h-12">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
            </div>
        </div>
    );
}
