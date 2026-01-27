import React from "react";

export const SidebarContext = React.createContext<{
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (v: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
}>({
    sidebarCollapsed: false,
    setSidebarCollapsed: () => { },
    sidebarOpen: false,
    setSidebarOpen: () => { },
});
