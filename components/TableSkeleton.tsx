"use client";

import React from "react";

export default function TableSkeleton({ rows = 10, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-md border border-gray-100 dark:border-strokedark overflow-hidden animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-meta-4">
                        <tr>
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-6 py-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: cols }).map((_, j) => (
                                    <td key={j} className="px-6 py-4">
                                        <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${j === 0 ? "w-48" : "w-16"}`}></div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
