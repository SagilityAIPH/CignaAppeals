import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [teamLeadId, setTeamLeadId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [pocId, setPocId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user from sessionStorage
    const storedUser = sessionStorage.getItem("currentUser");
    const storedRoleIds = sessionStorage.getItem("roleIds");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.removeItem("currentUser");
      }
    }

    if (storedRoleIds) {
      try {
        const parsed = JSON.parse(storedRoleIds);
        setAgentId(parsed.agentId || null);
        setTeamLeadId(parsed.teamLeadId || null);
        setClientId(parsed.clientId || null);
        setPocId(parsed.pocId || null);
      } catch {
        sessionStorage.removeItem("roleIds");
      }
    }

    setIsLoading(false);
  }, []);

  

  const saveRoleIdsToSession = (ids) => {
    sessionStorage.setItem(
      "roleIds",
      JSON.stringify({
        agentId,
        teamLeadId,
        clientId,
        pocId,
        ...ids,
      })
    );
  };

  const login = (userData) => {
  const userObj = {
    token: userData.token || '',
    agentID: (userData.agentID || '').trim(), 
    fullName: userData.fullName || '',   // <-- FIXED
    role: userData.role || '',
    landingPage: userData.landingPage || ''
  };

  console.log("Saving user to session:", userObj);

  setUser(userObj);
  sessionStorage.setItem('currentUser', JSON.stringify(userObj));
};
  const logout = () => {
    setUser(null);
    setAgentId(null);
    setTeamLeadId(null);
    setClientId(null);
    setPocId(null);

    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("roleIds");
    sessionStorage.removeItem("loginState");
    sessionStorage.clear();
  };

  const value = {
    user,
    isLoading,
    login,
    logout,

    // Role IDs
    agentId,
    teamLeadId,
    clientId,
    pocId,

    // Setters (with sessionStorage sync)
    setAgentId: (id) => {
      setAgentId(id);
      saveRoleIdsToSession({ agentId: id });
    },
    setTeamLeadId: (id) => {
      setTeamLeadId(id);
      saveRoleIdsToSession({ teamLeadId: id });
    },
    setClientId: (id) => {
      setClientId(id);
      saveRoleIdsToSession({ clientId: id });
    },
    setPocId: (id) => {
      setPocId(id);
      saveRoleIdsToSession({ pocId: id });
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
