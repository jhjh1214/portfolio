import { create } from 'zustand'

/** Which global dialogs are open. Lives outside components so any button can open them. */
interface UIState {
  auth: boolean
  theme: boolean
  palette: boolean
  setAuth: (o: boolean) => void
  setTheme: (o: boolean) => void
  setPalette: (o: boolean) => void
}
export const useUI = create<UIState>((set) => ({
  auth: false,
  theme: false,
  palette: false,
  setAuth: (auth) => set({ auth }),
  setTheme: (theme) => set({ theme }),
  setPalette: (palette) => set({ palette }),
}))
