import { createContext, useContext, useState, useCallback } from "react";

const BookingContext = createContext({
  open: false,
  openBooking: () => {},
  closeBooking: () => {},
});

export const useBooking = () => useContext(BookingContext);

export const BookingProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openBooking = useCallback(() => setOpen(true), []);
  const closeBooking = useCallback(() => setOpen(false), []);

  return (
    <BookingContext.Provider value={{ open, openBooking, closeBooking }}>
      {children}
    </BookingContext.Provider>
  );
};
