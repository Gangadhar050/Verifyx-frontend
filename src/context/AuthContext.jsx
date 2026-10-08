import{createContext,useContext,useState}from'react';
import{getSession}from'../services/storage';
import{logout as doLogout}from'../services/authService';

const AuthContext=createContext(null);export function AuthProvider({children}){const[session,setSessionState]=useState(getSession());const refresh=()=>setSessionState(getSession());const logout=()=>{doLogout();setSessionState(null)};return <AuthContext.Provider value={{session,refresh,logout}}>{children}</AuthContext.Provider>}
export const useAuthContext=()=>useContext(AuthContext);
