import { createContext, useContext, useState } from "react";

// Lets the hero tell the navbar whether the current slide is dark
// (so the logo + links can flip to a light colour and stay visible).
const HeaderThemeContext = createContext({ dark: false, setDark: () => {} });

export const useHeaderTheme = () => useContext(HeaderThemeContext);

export const HeaderThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(false);
  return (
    <HeaderThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </HeaderThemeContext.Provider>
  );
};
