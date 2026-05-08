import { useState, useEffect } from "react";

export function getStoredRole() {
  return localStorage.getItem("repair_desk_role");
}

export function useRole() {
  const [role, setRoleState] = useState(() => {
    return localStorage.getItem("repair_desk_role");
  });

  const setRole = (newRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("repair_desk_role", newRole);
    } else {
      localStorage.removeItem("repair_desk_role");
    }
  };

  const clearRole = () => setRole(null);

  return { role, setRole, clearRole };
}
