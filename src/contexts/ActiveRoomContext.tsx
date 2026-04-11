import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ActiveRoomState {
  roomId: string | null;
  isMinimized: boolean;
  roomName: string;
}

interface ActiveRoomContextType extends ActiveRoomState {
  openRoom: (roomId: string, roomName?: string) => void;
  minimizeRoom: () => void;
  expandRoom: () => void;
  closeRoom: () => void;
}

const ActiveRoomContext = createContext<ActiveRoomContextType | null>(null);

export const useActiveRoom = () => {
  const ctx = useContext(ActiveRoomContext);
  if (!ctx) throw new Error("useActiveRoom must be used within ActiveRoomProvider");
  return ctx;
};

export const ActiveRoomProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ActiveRoomState>({
    roomId: null,
    isMinimized: false,
    roomName: "",
  });

  const openRoom = useCallback((roomId: string, roomName = "Room") => {
    setState({ roomId, isMinimized: false, roomName });
  }, []);

  const minimizeRoom = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }));
  }, []);

  const expandRoom = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: false }));
  }, []);

  const closeRoom = useCallback(() => {
    setState({ roomId: null, isMinimized: false, roomName: "" });
  }, []);

  return (
    <ActiveRoomContext.Provider value={{ ...state, openRoom, minimizeRoom, expandRoom, closeRoom }}>
      {children}
    </ActiveRoomContext.Provider>
  );
};
